import { useState } from "react";

const GOLD = "#B8860B";
const DARK = "#1a1a1a";

// === DATA ===
const agents = [
  { id: "prep-director", name: "Prep Director", desc: "Pre-analyzes households overnight, surfaces planning opportunities on home screen cards", phase: "Phase 4", skills: ["household-opportunity-scanner"], tools: ["getHouseholdContext","getAccountBalances","getTaxDocumentData","getUpcomingMeetings","calculateRothConversion","calculateRMDProjection","renderInsightCard"], prompt: "You are analyzing household data to surface planning opportunities. For each household with an upcoming meeting or a triggered event, determine the highest-impact planning action and express it with specific numbers." },
  { id: "session-director", name: "Session Director", desc: "Orchestrates the live planning session — routes between agents, manages canvas state", phase: "Phase 1", skills: ["session-orchestration","conversation-quality"], tools: ["Canvas event tools","Session state tools"], prompt: "You are managing an advisor's planning session. Route to the right specialist, coordinate canvas updates, ensure the conversation stays productive. You are the conductor, not the soloist." },
  { id: "financial-planner", name: "Financial Planner", desc: "All quantitative analysis — Roth, RMD, SS, tax brackets, scenario comparison", phase: "Phase 1–2", skills: ["roth-conversion-analysis","rmd-projection","ss-optimization","tax-bracket-navigation","scenario-comparison"], tools: ["All calculation tools","All data access tools","Canvas event tools"], prompt: "You are a financial planning analyst. Run the appropriate calculations, show reasoning step-by-step via extended thinking, and present results with specific numbers. Never guess — compute." },
  { id: "clarification-agent", name: "Clarification Agent", desc: "Surfaces structured questions when missing data would change the recommendation", phase: "Phase 3", skills: ["data-gap-detection","assumption-surfacing"], tools: ["Data access tools"], prompt: "Surface clarifying questions only when the missing information would materially change the recommendation. Frame every question as a choice. Max 2 questions before proceeding." },
  { id: "document-agent", name: "Document Agent", desc: "Generates client-facing summary and PDF export from session state", phase: "Phase 5", deferred: true, skills: ["client-summary-generation","compliance-disclosure"], tools: ["renderSummaryDocument","Session state","PDF export"], prompt: "Produce the client-facing deliverable from session state. Use only language the client heard. No jargon. No hedge language. Keep it under one page." },
];

const skills = [
  { id: "calculation-verification", name: "Calculation Verification", desc: "Verifies every financial calculation before it reaches the advisor", agent: "Cross-cutting", category: "Product Verification", phase: 1, gotchas: ["IRMAA lookback is 2 years, not 1","Bracket-straddling produces blended rates","Pro-rata rule changes everything for mixed IRAs","State tax omission is the most common silent error"], scripts: ["verify_roth_conversion.py","verify_rmd_projection.py","verify_ss_threshold.py","cross_check_scenario.py"] },
  { id: "session-orchestration", name: "Session Orchestration", desc: "Routing logic, canvas coordination, state management during live sessions", agent: "Session Director", category: "Process Automation", phase: 1, gotchas: ["Don't double-route compound questions","Canvas state gets stale after assumption edits","'What else?' is meta, not a routing question","Token budget — suggest summary after 15 turns"], scripts: ["classify_intent.py","validate_canvas_state.py"] },
  { id: "roth-conversion-analysis", name: "Roth Conversion Analysis", desc: "Complete domain knowledge for modeling Roth conversion scenarios", agent: "Financial Planner", category: "Domain Knowledge", phase: 1, gotchas: ["Bracket math wrong when income straddles two brackets","Pro-rata rule is the silent killer","IRMAA lookback trips up multi-year plans","State tax is easy to forget","'Fill up the bracket' needs $2-5K headroom buffer"], scripts: ["bracket_headroom.py","breakeven_calculator.py","multi_year_ladder.py"] },
  { id: "scenario-comparison", name: "Scenario Comparison", desc: "Structure and present multi-scenario side-by-side analysis", agent: "Financial Planner", category: "Domain Knowledge", phase: 2, gotchas: ["Apples-to-apples is harder than it sounds with different time horizons","'Which is better' has a hidden assumption — better for what?","Close scenarios get false precision — call it equivalent if <$500/yr","'Do nothing' baseline isn't always 'no conversion'"], scripts: ["normalize_scenarios.py","rank_scenarios.py"] },
  { id: "ss-optimization", name: "SS Optimization", desc: "Social Security claiming strategy and threshold analysis", agent: "Financial Planner", category: "Domain Knowledge", phase: 2, gotchas: ["SS 'cliff' is a steep slope, not a cliff — don't overstate","Provisional income includes tax-exempt interest","Spousal benefits have different calculation basis","'When should they claim?' depends on things we can't model"], scripts: ["provisional_income.py","claiming_age_model.py","spousal_coordination.py"] },
  { id: "tax-bracket-navigation", name: "Tax Bracket Navigation", desc: "Multi-year tax planning across income sources", agent: "Financial Planner", category: "Domain Knowledge", phase: 2, gotchas: ["Advisors confuse marginal vs effective rate every time","'Jumping a bracket' doesn't tax all income higher","Capital gains have separate brackets","NIIT is a shadow bracket at $250K","State tax changes the entire picture"], scripts: ["bracket_position.py","income_stacking.py","multi_year_planner.py"] },
  { id: "data-gap-detection", name: "Data Gap Detection", desc: "When and how to surface clarifying questions about missing data", agent: "Clarification Agent", category: "Data Quality", phase: 3, gotchas: ["Too many questions kills session flow — max 2","Advisor doesn't always know the answer — proceed with conservative default","Some gaps compound — ask filing status first, it resolves multiple gaps","Don't ask for data already in the household profile"], scripts: ["materiality_check.py","question_formatter.py"] },
  { id: "assumption-surfacing", name: "Assumption Surfacing", desc: "Make implicit assumptions explicit for advisor audit", agent: "Clarification Agent", category: "Data Quality", phase: 3, gotchas: ["Surface AFTER the primary answer, not before","Don't surface every assumption — only meaningful ones","'Current tax rates' is itself an assumption (TCJA sunset)","Advisors will adjust assumptions to get the answer they want — compute it anyway"], scripts: ["sensitivity_analysis.py"] },
  { id: "conversation-quality", name: "Conversation Quality", desc: "Trust-building patterns: show reasoning, lead with numbers, never argue", agent: "Session Director", category: "Quality Standards", phase: 1, gotchas: ["'Great question!' is a trust killer","Repeating the question wastes time","Over-qualifying undermines confidence","Never say 'it depends' without saying what it depends ON"], scripts: [] },
  { id: "household-opportunity-scanner", name: "Opportunity Scanner", desc: "Analyze households, identify the highest-impact planning action", agent: "Prep Director", category: "Process Automation", phase: 4, gotchas: ["Stale data (>90 days) produces bad insights","One opportunity per card, not three","'Consider reviewing' is not an insight — use specific numbers","False positives erode trust faster than missed opportunities"], scripts: ["detect_roth_window.py","detect_rmd_cliff.py","detect_ss_decision.py","score_opportunities.py"] },
  { id: "client-summary-generation", name: "Client Summary Gen", desc: "Produce client-facing summary from session state", agent: "Document Agent", category: "Process Automation", phase: 5, deferred: true, gotchas: ["Only include what was actually discussed","Client language differs from advisor language","Don't round to false precision OR excessive vagueness","Assumptions section is legally important — never skip"], scripts: ["compile_session_state.py","format_summary.py","validate_disclosures.py"] },
];

const tools = [
  { id: "getHouseholdContext", name: "getHouseholdContext", desc: "Fetch full household profile via GraphQL AI endpoint", type: "data" },
  { id: "getAccountBalances", name: "getAccountBalances", desc: "Current balances by account type from custodian data", type: "data" },
  { id: "getTaxDocumentData", name: "getTaxDocumentData", desc: "Parsed data from uploaded tax returns", type: "data" },
  { id: "getAdvisorNotes", name: "getAdvisorNotes", desc: "CRM notes and prior session context", type: "data" },
  { id: "getUpcomingMeetings", name: "getUpcomingMeetings", desc: "Calendar data — next scheduled meetings", type: "data" },
  { id: "calculateRothConversion", name: "calculateRothConversion", desc: "Deterministic Roth conversion scenario modeling", type: "calc" },
  { id: "calculateRMDProjection", name: "calculateRMDProjection", desc: "Year-by-year RMD schedule projection", type: "calc" },
  { id: "calculateSSThreshold", name: "calculateSSThreshold", desc: "Social Security threshold and cliff analysis", type: "calc" },
  { id: "calculateTaxBracketImpact", name: "calculateTaxBracketImpact", desc: "Marginal and effective tax rate modeling", type: "calc" },
  { id: "calculateIRMAA", name: "calculateIRMAA", desc: "Medicare premium threshold analysis", type: "calc" },
  { id: "renderScenarioCard", name: "renderScenarioCard", desc: "Single scenario summary card on canvas", type: "canvas" },
  { id: "renderComparisonChart", name: "renderComparisonChart", desc: "Multi-column scenario comparison", type: "canvas" },
  { id: "renderProjectionChart", name: "renderProjectionChart", desc: "Time-series projection chart", type: "canvas" },
  { id: "renderThresholdChart", name: "renderThresholdChart", desc: "Income vs. threshold visualization", type: "canvas" },
  { id: "renderInsightCard", name: "renderInsightCard", desc: "Home screen insight card", type: "canvas" },
  { id: "renderSummaryDocument", name: "renderSummaryDocument", desc: "Client-facing summary document", type: "canvas" },
];

const flowSteps = [
  { step: 1, label: "Home Screen", title: "Household cards with pre-analyzed insights", desc: "The Prep Director has already run overnight analysis. The Harper card reads: \"Margaret has an 8-year window before RMDs force distributions at a higher rate. Converting $35–50K/year stays in the 22% bracket.\"", badges: [{ t: "a", l: "Prep Director" },{ t: "s", l: "Opportunity Scanner" },{ t: "t", l: "getHouseholdContext" },{ t: "t", l: "calculateRothConversion" },{ t: "t", l: "renderInsightCard" }] },
  { step: 2, label: "Open Session", title: "Planning workbench loads with context", desc: "Advisor clicks into Harpers. Split-screen loads — chat left, canvas right. AI opens with Roth framing grounded in real account numbers.", badges: [{ t: "a", l: "Session Director" },{ t: "s", l: "Session Orchestration" },{ t: "t", l: "getHouseholdContext" },{ t: "t", l: "getAccountBalances" },{ t: "t", l: "renderScenarioCard" }] },
  { step: 3, label: "First Scenario", title: "\"What if we did $50K instead of $35K?\"", desc: "Session Director routes to Financial Planner. Roth skill loads. Verification runs. Canvas updates with comparison chart.", badges: [{ t: "a", l: "Session Director → Financial Planner" },{ t: "s", l: "Roth Conversion Analysis" },{ t: "v", l: "Calculation Verification" },{ t: "t", l: "calculateRothConversion" },{ t: "t", l: "renderComparisonChart" }] },
  { step: 4, label: "Reasoning Visible", title: "Extended thinking shows the math", desc: "Current AGI: $143K. Top of 22% bracket: $201,050. Headroom: $58,050. $50K conversion → new AGI $193K. Still in 22%. Tax cost: $11,000. IRMAA check: clear.", badges: [{ t: "s", l: "Conversation Quality" },{ t: "v", l: "Calculation Verification" }] },
  { step: 5, label: "SS Cliff Question", title: "\"Does that push us into the SS cliff?\"", desc: "Financial Planner loads SS optimization skill. Calculates provisional income impact. Threshold chart appears on canvas.", badges: [{ t: "a", l: "Financial Planner" },{ t: "s", l: "SS Optimization" },{ t: "v", l: "Calculation Verification" },{ t: "t", l: "calculateSSThreshold" },{ t: "t", l: "renderThresholdChart" }] },
  { step: 6, label: "Compare Scenarios", title: "$35K, $50K, and $65K side-by-side", desc: "Three-column comparison: tax cost, projected Roth balance, SS impact, breakeven year. Key insight: \"$65K crosses IRMAA — $800/yr Medicare surcharge.\"", badges: [{ t: "s", l: "Scenario Comparison" },{ t: "v", l: "Calculation Verification" },{ t: "t", l: "calculateRothConversion ×3" },{ t: "t", l: "calculateIRMAA ×3" },{ t: "t", l: "renderComparisonChart" }] },
  { step: 7, label: "Publish Summary", title: "One-click client summary", desc: "Advisor clicks Publish. Session state compiled into a client-facing document with disclosures. Advisor reviews, edits, exports to PDF.", badges: [{ t: "a", l: "Document Agent (v2)" },{ t: "s", l: "Client Summary Gen" },{ t: "t", l: "renderSummaryDocument" }] },
];

const buildPhases = [
  { num: 1, title: "Core Loop", desc: "Chat + single calculation + verification + canvas update. This is the demo.", items: [{ type: "Agent", name: "Session Director, Financial Planner" },{ type: "Skill", name: "calculation-verification, session-orchestration, roth-conversion-analysis" },{ type: "Tool", name: "getHouseholdContext, calculateRothConversion, renderScenarioCard" }] },
  { num: 2, title: "Multi-Scenario", desc: "Comparison charts, multiple calculation types, full canvas protocol.", items: [{ type: "Skill", name: "scenario-comparison, ss-optimization, tax-bracket-navigation" },{ type: "Tool", name: "calculateSSThreshold, calculateIRMAA, renderComparisonChart, renderThresholdChart" }] },
  { num: 3, title: "Intelligence Layer", desc: "Clarification, assumption surfacing, conversation quality.", items: [{ type: "Agent", name: "Clarification Agent" },{ type: "Skill", name: "data-gap-detection, assumption-surfacing, conversation-quality" }] },
  { num: 4, title: "Prep Layer", desc: "Overnight analysis, home screen cards, session pre-loading.", items: [{ type: "Agent", name: "Prep Director" },{ type: "Skill", name: "household-opportunity-scanner" },{ type: "Tool", name: "getUpcomingMeetings, renderInsightCard" }] },
  { num: 5, title: "Publish", desc: "Client summary generation, compliance, PDF export.", items: [{ type: "Agent", name: "Document Agent" },{ type: "Skill", name: "client-summary-generation, compliance-disclosure" },{ type: "Tool", name: "renderSummaryDocument, PDF export" }] },
];

// === CATEGORY COLORS ===
const catColors = {
  "Product Verification": { bg: "#F3E8FE", text: "#7B1FA2" },
  "Process Automation": { bg: "#E8F0FE", text: "#1967D2" },
  "Domain Knowledge": { bg: "#FEF3E8", text: "#B8860B" },
  "Data Quality": { bg: "#E8F5E9", text: "#2E7D32" },
  "Quality Standards": { bg: "#E0F7FA", text: "#00838F" },
};

const tagStyles = {
  agent: { bg: "#E8F0FE", text: "#1967D2" },
  skill: { bg: "#FEF3E8", text: "#B8860B" },
  tool: { bg: "#E8F5E9", text: "#2E7D32" },
  data: { bg: "#FCE4EC", text: "#C62828" },
  calc: { bg: "#FFF3E0", text: "#E65100" },
  canvas: { bg: "#E0F7FA", text: "#00838F" },
  deferred: { bg: "#F3E8FE", text: "#7B1FA2" },
  verification: { bg: "#F3E8FE", text: "#7B1FA2" },
};

// === COMPONENTS ===
function Tag({ label, type }) {
  const s = tagStyles[type] || tagStyles.skill;
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, marginRight: 4, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.3, background: s.bg, color: s.text }}>
      {label}
    </span>
  );
}

function Card({ title, desc, tags, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "#FFFDF5" : "#fff",
        border: `1px solid ${selected ? GOLD : "#e0ddd8"}`,
        borderRadius: 8,
        padding: "16px 20px",
        cursor: "pointer",
        minWidth: 180,
        flex: "1 1 200px",
        maxWidth: 320,
        transition: "all 0.15s",
        boxShadow: selected ? `0 0 0 1px ${GOLD}` : "none",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>{desc}</div>
      <div style={{ marginTop: 8 }}>{tags}</div>
    </div>
  );
}

function DetailPanel({ item, onClose }) {
  if (!item) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 190 }} />
      <div style={{ position: "fixed", right: 0, top: 0, width: 480, height: "100vh", background: "#fff", borderLeft: "1px solid #e0ddd8", padding: 32, overflowY: "auto", zIndex: 200, boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999" }}>×</button>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, paddingRight: 40 }}>{item.name}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {item.tags}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333", marginBottom: 16 }}>{item.desc}</p>

        {item.agent && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>Agent</h4>
            <p style={{ fontSize: 14, color: "#333" }}>{item.agent}</p>
          </>
        )}

        {item.category && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>Category</h4>
            <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 4, background: (catColors[item.category] || {}).bg, color: (catColors[item.category] || {}).text }}>{item.category}</span>
          </>
        )}

        {item.prompt && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>System Prompt Essence</h4>
            <p style={{ fontSize: 14, color: "#333", fontStyle: "italic", borderLeft: `3px solid ${GOLD}`, paddingLeft: 12, lineHeight: 1.6 }}>{item.prompt}</p>
          </>
        )}

        {item.skills && item.skills.length > 0 && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>Skills</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.skills.map(s => <span key={s} style={{ display: "inline-block", background: "#f5f5f0", border: "1px solid #e0ddd8", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>{s}</span>)}
            </div>
          </>
        )}

        {item.tools && item.tools.length > 0 && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>Tools</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.tools.map(t => <span key={t} style={{ display: "inline-block", background: "#f5f5f0", border: "1px solid #e0ddd8", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>{t}</span>)}
            </div>
          </>
        )}

        {item.scripts && item.scripts.length > 0 && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>Scripts</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.scripts.map(s => <span key={s} style={{ display: "inline-block", background: "#FFF3E0", border: "1px solid #FFE0B2", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontFamily: "monospace" }}>{s}</span>)}
            </div>
          </>
        )}

        {item.gotchas && item.gotchas.length > 0 && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#C62828", margin: "20px 0 8px" }}>Gotchas</h4>
            <ul style={{ paddingLeft: 20 }}>
              {item.gotchas.map((g, i) => <li key={i} style={{ fontSize: 13, color: "#333", lineHeight: 1.5, marginBottom: 6 }}>{g}</li>)}
            </ul>
          </>
        )}

        {item.phase && (
          <>
            <h4 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: GOLD, margin: "20px 0 8px" }}>Build Phase</h4>
            <p style={{ fontSize: 14, color: "#333" }}>{typeof item.phase === "number" ? `Phase ${item.phase}` : item.phase}</p>
          </>
        )}
      </div>
    </>
  );
}

function FlowBadge({ type, label }) {
  const colors = { a: tagStyles.agent, s: tagStyles.skill, t: tagStyles.tool, v: tagStyles.verification };
  const c = colors[type] || tagStyles.tool;
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 500, background: c.bg, color: c.text, display: "inline-block" }}>{label}</span>;
}

export default function PlanningArchitecture() {
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState(null);

  const openDetail = (item) => setDetail(item);
  const closeDetail = () => setDetail(null);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", background: "#FAFAF8", color: DARK, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: DARK, color: "#fff", padding: "24px 32px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>Planning Agent Architecture</h1>
        <p style={{ color: "#999", marginTop: 4, fontSize: 13 }}>Savvy Wealth — Financial Planning Workbench · Skills, Tools, and Agents</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e0ddd8", background: "#fff", padding: "0 32px", position: "sticky", top: 0, zIndex: 100 }}>
        {[["overview","System Overview"],["flow","Demo Flow"],["build","Build Phases"],["deps","Dependencies"]].map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "14px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderBottom: `2px solid ${tab === id ? GOLD : "transparent"}`, color: tab === id ? DARK : "#666", transition: "all 0.15s" }}>
            {label}
          </div>
        ))}
      </div>

      {/* SYSTEM OVERVIEW */}
      {tab === "overview" && (
        <div style={{ padding: "32px 32px", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Three-Layer Architecture</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 28, maxWidth: 720 }}>Agents orchestrate. Skills provide domain knowledge. Tools do the work. Click any card to see the full specification.</div>

          {/* Agents Layer */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 20, marginBottom: 28, alignItems: "start" }}>
            <div style={{ background: DARK, color: "#fff", padding: "14px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Agents<span style={{ display: "block", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#999", fontSize: 11, marginTop: 4 }}>Who does the work</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {agents.map(a => (
                <Card key={a.id} title={a.name} desc={a.desc} selected={detail?.id === a.id}
                  tags={<><Tag label="Agent" type="agent" />{a.deferred && <Tag label="Deferred" type="deferred" />}</>}
                  onClick={() => openDetail({ ...a, tags: <><Tag label="Agent" type="agent" />{a.deferred && <Tag label="Deferred" type="deferred" />}</> })}
                />
              ))}
            </div>
          </div>

          {/* Skills Layer */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 20, marginBottom: 28, alignItems: "start" }}>
            <div style={{ background: DARK, color: "#fff", padding: "14px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Skills<span style={{ display: "block", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#999", fontSize: 11, marginTop: 4 }}>What they know</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {skills.map(s => {
                const cc = catColors[s.category] || {};
                return (
                  <Card key={s.id} title={s.name} desc={s.desc} selected={detail?.id === s.id}
                    tags={<><Tag label="Skill" type="skill" /><span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, marginRight: 4, marginTop: 4, background: cc.bg, color: cc.text }}>{s.category}</span>{s.deferred && <Tag label="Deferred" type="deferred" />}</>}
                    onClick={() => openDetail({ ...s, tags: <><Tag label="Skill" type="skill" /><span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, marginRight: 4, background: cc.bg, color: cc.text }}>{s.category}</span></> })}
                  />
                );
              })}
            </div>
          </div>

          {/* Tools Layer */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ background: DARK, color: "#fff", padding: "14px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tools<span style={{ display: "block", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#999", fontSize: 11, marginTop: 4 }}>What they can do</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tools.map(t => (
                <Card key={t.id} title={t.name} desc={t.desc} selected={detail?.id === t.id}
                  tags={<Tag label={t.type === "data" ? "Data Access" : t.type === "calc" ? "Calculation" : "Canvas Event"} type={t.type} />}
                  onClick={() => openDetail({ ...t, tags: <Tag label={t.type === "data" ? "Data Access" : t.type === "calc" ? "Calculation" : "Canvas Event"} type={t.type} /> })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DEMO FLOW */}
      {tab === "flow" && (
        <div style={{ padding: "32px 32px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Demo Walkthrough: Layer Activation</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 28, maxWidth: 720 }}>Tracing through the PRD's 7-step demo showing which agent, skill, and tool activates at each step.</div>

          <div style={{ position: "relative" }}>
            {flowSteps.map((fs, i) => (
              <div key={fs.step} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 20, borderLeft: i < flowSteps.length - 1 ? "2px solid #e0ddd8" : "2px solid transparent", marginLeft: 40, paddingLeft: 36, paddingBottom: 8, paddingTop: 0, position: "relative" }}>
                <div style={{ position: "absolute", left: -18, top: 0, width: 36, height: 36, background: GOLD, color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{fs.step}</div>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "#999", letterSpacing: 0.5, paddingTop: 8 }}>{fs.label}</div>
                <div style={{ background: "#fff", border: "1px solid #e0ddd8", borderRadius: 8, padding: "16px 20px", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{fs.title}</h3>
                  <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 10 }}>{fs.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {fs.badges.map((b, j) => <FlowBadge key={j} type={b.t} label={b.l} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BUILD PHASES */}
      {tab === "build" && (
        <div style={{ padding: "32px 32px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Build Sequence</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 28 }}>Five phases from demo to product. Each ships a testable increment.</div>

          {buildPhases.map(ph => (
            <div key={ph.num} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, background: DARK, color: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{ph.num}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{ph.title}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{ph.desc}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginLeft: 58 }}>
                {ph.items.map((item, i) => (
                  <div key={i} style={{ background: "#fff", border: "1px solid #e0ddd8", borderRadius: 6, padding: "10px 14px", fontSize: 13 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#999", display: "block", marginBottom: 2 }}>{item.type}</span>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ borderLeft: `3px solid ${GOLD}`, paddingLeft: 16, marginTop: 20, fontStyle: "italic", fontSize: 14, color: "#555" }}>
            Phase 1 is the demo. Phases 2–3 make it feel real. Phases 4–5 make it a product.
          </div>
        </div>
      )}

      {/* DEPENDENCIES */}
      {tab === "deps" && (
        <div style={{ padding: "32px 32px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Dependency Map</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 28 }}>Which agents use which skills, and which skills call which tools.</div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: DARK, color: "#fff" }}>
                  {["Agent / Layer","Skills","Primary Tools","Phase"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { agent: "Cross-cutting", skills: "calculation-verification", tools: "Verification scripts (deterministic cross-checks)", phase: "Phase 1", highlight: true },
                  { agent: "Session Director", skills: "session-orchestration, conversation-quality", tools: "Canvas event tools, session state tools", phase: "Phase 1" },
                  { agent: "Financial Planner", skills: "roth-conversion, rmd-projection, ss-optimization, tax-bracket-nav, scenario-comparison", tools: "All calculation tools, all data access tools, canvas event tools", phase: "Phase 1–2" },
                  { agent: "Clarification Agent", skills: "data-gap-detection, assumption-surfacing", tools: "Data access tools", phase: "Phase 3" },
                  { agent: "Prep Director", skills: "household-opportunity-scanner", tools: "All data & calculation tools, renderInsightCard", phase: "Phase 4" },
                  { agent: "Document Agent", skills: "client-summary-gen, compliance-disclosure", tools: "renderSummaryDocument, session state, PDF export", phase: "Phase 5" },
                ].map((row, i) => (
                  <tr key={i} style={{ background: row.highlight ? "#F3E8FE" : i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #e0ddd8" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{row.agent}</td>
                    <td style={{ padding: "10px 14px", color: GOLD }}>{row.skills}</td>
                    <td style={{ padding: "10px 14px", color: "#555", fontSize: 12 }}>{row.tools}</td>
                    <td style={{ padding: "10px 14px" }}>{row.phase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 32, fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Key Architecture Decisions</div>
          {[
            { title: "Single session for v1", body: "Agent boundaries enforced by prompt structure, not separate API calls. Revisit for v2 if isolation becomes necessary." },
            { title: "Canvas event protocol", body: "Structured JSON events emitted by AI, rendered deterministically by frontend. Never parse AI text for rendering." },
            { title: "Deterministic calculations", body: "Calculation tools are tested code (Python/TS functions), not AI-generated math. Non-negotiable for advisor trust." },
            { title: "Progressive skill loading", body: "YAML frontmatter always in context. Full SKILL.md at session start. Reference files only when relevant skill activates." },
            { title: "State persistence", body: "Structured session state (not just transcript): scenarios, assumptions, advisor preferences, canvas state." },
            { title: "Calculation verification", body: "Every calculation passes through a dedicated verification skill before reaching the advisor. Verification scripts implement the same math as calculation tools and compare outputs." },
          ].map((d, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${GOLD}`, paddingLeft: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{i + 1}. {d.title}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{d.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel item={detail} onClose={closeDetail} />
    </div>
  );
}
