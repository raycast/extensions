import { longestStreak, fmtInt, fmtCompact, fmtUSD, shortPath, truncate, truncateMiddle, truncatePath, terminalWidth, boxedLine, boxedBlank, boxedTitle, boxedFooter, infoLine, bar, topLine, sortedEntries, topSection, withOther } from "./format.js";
import { localDay, sumMapValues } from "./utils.js";
import { sessionMessageCount, sessionTokenCount, tokenVolume, emptyTokens, addTokens } from "./session.js";
import { costEstimateNotes } from "./pricing.js";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function costDetails(rows) {
  const keys = ["input_tokens", "cached_input_tokens", "output_tokens"];
  const widths = keys.map((key) => Math.max(4, ...rows.map((entry) => fmtCompact(entry.tokens[key]).length)));
  return new Map(rows.map((entry) => {
    const values = keys.map((key, index) => fmtCompact(entry.tokens[key]).padStart(widths[index]));
    return [entry, `${values[0]} in · ${values[1]} cached · ${values[2]} out`];
  }));
}

export function costLine(entry, totalCost, innerWidth, detail = costDetails([entry]).get(entry)) {
  const costWidth = 10;
  const detailWidth = Math.max(34, detail.length);
  const percentWidth = 4;
  const availableNameWidth = innerWidth - 2 - 1 - costWidth - 2 - detailWidth - 1 - percentWidth;
  const nameWidth = Math.max(8, availableNameWidth);
  const percent = totalCost > 0 ? Math.round((entry.cost / totalCost) * 100) : 0;
  const left = `  ${truncateMiddle(entry.model, nameWidth).padEnd(nameWidth)}`;
  const middle = fmtUSD(entry.cost).padStart(costWidth);
  const right = `${truncate(detail, detailWidth).padEnd(detailWidth)} ${`${percent}%`.padStart(percentWidth)}`;
  return boxedLine(`${left} ${middle}  ${right}`, innerWidth);
}

function summarizeCostModels(models) {
  const tokens = emptyTokens();
  let cost = 0;
  for (const entry of models) {
    addTokens(tokens, entry.tokens);
    cost += entry.cost ?? 0;
  }
  return { tokens, cost };
}

function costRows(models, limit) {
  return withOther(models.map((entry) => [entry.model, entry]), limit, summarizeCostModels)
    .map(([model, entry]) => ({ ...entry, model }));
}

function unpricedModelLabels(estimate, limit) {
  return costRows(estimate.unpricedModels, limit)
    .map((entry) => `${entry.model} (${fmtCompact(tokenVolume(entry.tokens))} tokens)`)
    .join(", ");
}

export function costSection(lines, title, estimate, limit, innerWidth) {
  lines.push(boxedLine(title, innerWidth));
  if (estimate.modelCosts.length === 0) {
    lines.push(boxedLine("  none", innerWidth));
  }

  const rows = costRows(estimate.modelCosts, limit);
  const details = costDetails(rows);
  for (const entry of rows) {
    lines.push(costLine(entry, estimate.totalCost, innerWidth, details.get(entry)));
  }
  for (const note of costEstimateNotes(estimate)) {
    lines.push(boxedLine(`  ${note}`, innerWidth));
  }

  if (estimate.unpricedModels.length > 0) {
    for (const entry of costRows(estimate.unpricedModels, limit)) {
      lines.push(boxedLine(`  unpriced: ${entry.model} (${fmtCompact(tokenVolume(entry.tokens))} tokens)`, innerWidth));
    }
  }
}

export function plainCostSection(estimate, limit) {
  const lines = ["Estimated API cost by model", ""];
  if (estimate.modelCosts.length === 0) {
    lines.push("none");
  }

  const rows = costRows(estimate.modelCosts, limit);
  const details = costDetails(rows);
  const modelWidth = Math.min(
    Math.max(12, terminalWidth() - 57),
    Math.max(12, ...rows.map((entry) => entry.model.length)),
  );
  for (const entry of rows) {
    const detail = details.get(entry);
    lines.push(`${truncateMiddle(entry.model, modelWidth).padEnd(modelWidth)} ${fmtUSD(entry.cost).padStart(10)}  ${detail}`);
  }
  lines.push("");
  lines.push(`Total estimated API cost: ${fmtUSD(estimate.totalCost)}`);
  lines.push(...costEstimateNotes(estimate));
  if (estimate.unpricedModels.length > 0) {
    lines.push(`Unpriced models: ${unpricedModelLabels(estimate, limit)}`);
  }
  return lines;
}

const SKILL_SCOPE_ORDER = ["personal", "app", "system", "repo", "unknown"];
const skillScopeLabel = (scope) => scope === "repo" ? "repo-specific" : scope;

function appendSkillReads(lines, analysis, limit) {
  if (analysis.topReads.length === 0) { lines.push("none"); return; }
  const totalReads = analysis.topReads.reduce((sum, entry) => sum + entry.reads, 0);
  for (const scope of SKILL_SCOPE_ORDER) {
    const entries = withOther(
      analysis.topReads.filter((entry) => entry.scope === scope).map((entry) => [entry.name, entry]),
      limit,
      (values) => ({
        reads: values.reduce((sum, entry) => sum + entry.reads, 0),
        readSessions: values.reduce((sum, entry) => sum + entry.readSessions, 0),
      }),
    ).map(([name, entry]) => ({ ...entry, name }));
    if (entries.length === 0) {
      continue;
    }

    if (lines.at(-1) !== "") {
      lines.push("");
    }
    lines.push(skillScopeLabel(scope));

    const nameWidth = Math.min(
      Math.max(18, terminalWidth() - 50),
      Math.max(18, ...entries.map((entry) => entry.name.length)),
    );
    for (const entry of entries) {
      const reads = `${fmtInt(entry.reads)} reads`.padStart(10);
      const sessions = `${fmtInt(entry.readSessions)} sessions`.padStart(12);
      const percent = totalReads > 0 ? Math.round((entry.reads / totalReads) * 100) : 0;
      lines.push(`${truncateMiddle(entry.name, nameWidth).padEnd(nameWidth)} ${reads} ${sessions}  ${bar(entry.reads, totalReads, 16)} ${`${percent}%`.padStart(4)}`);
    }
  }
}

export function plainSkillsSection(analysis, limit) {
  const lines = [
    "Skills",
    "",
    `Active skills        ${fmtInt(analysis.activeSkills.length)}`,
    `With evidence        ${fmtInt(analysis.withEvidenceCount)}`,
    `SKILL.md reads       ${fmtInt(sumMapValues(analysis.evidence.reads))}`,
    `$skill mentions     ${fmtInt(sumMapValues(analysis.evidence.mentions))}`,
    `No evidence          ${fmtInt(analysis.noEvidence.length)}`,
    "",
    "Top skills by SKILL.md reads",
    "",
  ];

  appendSkillReads(lines, analysis, limit);

  lines.push("");
  lines.push("Active skills by scope");
  lines.push("");

  const totalActive = analysis.activeSkills.length;
  for (const scope of SKILL_SCOPE_ORDER) {
    const row = analysis.byScope.get(scope);
    if (!row) {
      continue;
    }
    const labelText = skillScopeLabel(scope);
    const detail = `${fmtInt(row.evidence)}/${fmtInt(row.active)} with evidence`.padStart(24);
    const percent = totalActive > 0 ? Math.round((row.active / totalActive) * 100) : 0;
    lines.push(`${labelText.padEnd(14)} ${detail}  ${bar(row.active, totalActive, 16)} ${`${percent}%`.padStart(4)}`);
  }

  if (analysis.noEvidence.length > 0) {
    lines.push("");
    lines.push("No evidence");
    lines.push("");
    for (const name of analysis.noEvidence.slice(0, limit)) {
      lines.push(name);
    }
    if (analysis.noEvidence.length > limit) {
      lines.push(`Other (${analysis.noEvidence.length - limit})`);
    }
  }

  lines.push("");
  lines.push("Best-effort from transcript evidence; SKILL.md reads are stronger than $skill mentions.");
  return lines;
}

export function plainTopLine(name, count, total, unit, nameWidth) {
  const barWidth = 16;
  const percentWidth = 4;
  const countWidth = 16;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  const displayName = name.includes("/") ? truncatePath(name, nameWidth) : truncateMiddle(name, nameWidth);
  const middle = `${fmtInt(count)} ${unit}`.padStart(countWidth);
  return `${displayName.padEnd(nameWidth)} ${middle}  ${bar(count, total, barWidth)} ${`${percent}%`.padStart(percentWidth)}`;
}

export function plainTopSection(title, map, limit, unit, { emptyText = "none" } = {}) {
  const entries = sortedEntries(map);
  const lines = [title, ""];
  if (entries.length === 0) {
    lines.push(emptyText);
    return lines;
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const maxNameWidth = Math.max(12, terminalWidth() - 40);
  const visible = withOther(entries, limit);
  const nameWidth = Math.min(maxNameWidth, Math.max(12, ...visible.map(([name]) => shortPath(name).length)));
  for (const [name, count] of visible) {
    lines.push(plainTopLine(shortPath(name), count, total, unit, nameWidth));
  }
  return lines;
}

function sortedActivity(map) {
  return [...map.entries()].sort((a, b) => b[1].tokens - a[1].tokens || a[0].localeCompare(b[0]));
}

export function activityLine(name, activity, totalTokens, innerWidth, detail) {
  const barWidth = 16;
  const percentWidth = 4;
  const detailWidth = Math.max(20, detail.length);
  const availableNameWidth = innerWidth - 2 - 1 - detailWidth - 2 - barWidth - 1 - percentWidth;
  const nameWidth = Math.max(12, availableNameWidth);
  const percent = totalTokens > 0 ? Math.round((activity.tokens / totalTokens) * 100) : 0;
  const displayName = name.includes("/") ? truncatePath(name, nameWidth) : truncateMiddle(name, nameWidth);
  const left = `  ${displayName.padEnd(nameWidth)}`;
  const middle = truncate(detail, detailWidth).padStart(detailWidth);
  const right = `${bar(activity.tokens, totalTokens, barWidth)} ${`${percent}%`.padStart(percentWidth)}`;
  return boxedLine(`${left} ${middle}  ${right}`, innerWidth);
}

function activityRows(entries, limit) {
  return withOther(entries, limit, (values) => ({
    messages: values.reduce((sum, activity) => sum + activity.messages, 0),
    tokens: values.reduce((sum, activity) => sum + activity.tokens, 0),
  }));
}

export function activitySection(lines, title, map, limit, innerWidth) {
  const entries = sortedActivity(map);
  lines.push(boxedLine(title, innerWidth));
  if (entries.length === 0 || entries.every(([, activity]) => activity.messages === 0 && activity.tokens === 0)) {
    lines.push(boxedLine("  none", innerWidth));
    return;
  }

  const totalTokens = entries.reduce((sum, [, activity]) => sum + activity.tokens, 0);
  const visible = activityRows(entries, limit);
  const details = activityDetails(new Map(visible));
  for (const [name, activity] of visible) {
    lines.push(activityLine(name, activity, totalTokens, innerWidth, details.get(name)));
  }
}

export function plainActivityLine(name, activity, totalTokens, nameWidth, detail) {
  const barWidth = 16;
  const percentWidth = 4;
  const detailWidth = Math.max(20, detail.length);
  const percent = totalTokens > 0 ? Math.round((activity.tokens / totalTokens) * 100) : 0;
  const displayName = name.includes("/") ? truncatePath(name, nameWidth) : truncateMiddle(name, nameWidth);
  return `${displayName.padEnd(nameWidth)} ${detail.padStart(detailWidth)}  ${bar(activity.tokens, totalTokens, barWidth)} ${`${percent}%`.padStart(percentWidth)}`;
}

export function plainActivitySection(title, map, limit) {
  const entries = sortedActivity(map);
  const lines = [title, ""];
  if (entries.length === 0 || entries.every(([, activity]) => activity.messages === 0 && activity.tokens === 0)) {
    lines.push("none");
    return lines;
  }

  const totalTokens = entries.reduce((sum, [, activity]) => sum + activity.tokens, 0);
  const visible = activityRows(entries, limit);
  const details = activityDetails(new Map(visible));
  const maxNameWidth = Math.max(12, terminalWidth() - 43);
  const nameWidth = Math.min(maxNameWidth, Math.max(12, ...visible.map(([name]) => name.length)));
  for (const [name, activity] of visible) {
    lines.push(plainActivityLine(name, activity, totalTokens, nameWidth, details.get(name)));
  }
  return lines;
}

export function monthlyActivity(daySessions) {
  const months = new Map();
  for (const [day, activity] of daySessions) {
    const month = day === "(undated)" ? day : day.slice(0, 7);
    if (!months.has(month)) {
      months.set(month, { messages: 0, tokens: 0 });
    }
    months.get(month).messages += activity.messages;
    months.get(month).tokens += activity.tokens;
  }
  return months;
}

export function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

export function weeklyActivity(sessions) {
  const counts = new Map(WEEKDAYS.map((day) => [day, { messages: 0, tokens: 0 }]));
  for (const session of sessions) {
    for (const daily of session.days.values()) {
      if (!daily.firstTs) continue;
      const day = WEEKDAYS[weekdayIndex(daily.firstTs)];
      const activity = counts.get(day);
      activity.messages += sessionMessageCount(daily);
      activity.tokens += sessionTokenCount(daily);
    }
  }
  return counts;
}

export function activityDetails(counts, formatMessages = fmtCompact, messageUnit = "msg") {
  const messageWidth = Math.max(4, ...[...counts.values()].map((activity) => formatMessages(activity.messages).length));
  const tokenWidth = Math.max(4, ...[...counts.values()].map((activity) => fmtCompact(activity.tokens).length));
  return new Map([...counts].map(([day, activity]) => [
    day,
    `${formatMessages(activity.messages).padStart(messageWidth)} ${messageUnit} | ${fmtCompact(activity.tokens).padStart(tokenWidth)} tok`,
  ]));
}

export function weeklyActivitySection(lines, sessions, innerWidth) {
  const counts = weeklyActivity(sessions);
  const details = activityDetails(counts, fmtInt, "messages");
  const maxTokens = Math.max(...[...counts.values()].map((activity) => activity.tokens), 0);
  const labelWidth = 5;
  const detailWidth = Math.max(28, ...[...details.values()].map((detail) => detail.length));
  const barWidth = Math.max(12, Math.min(28, innerWidth - 2 - labelWidth - 1 - detailWidth));

  lines.push(boxedLine("Weekly activity", innerWidth));
  if (maxTokens === 0 && [...counts.values()].every((activity) => activity.messages === 0)) {
    lines.push(boxedLine("  none", innerWidth));
    return;
  }

  for (const [day, activity] of counts) {
    const line = `  ${day.padEnd(labelWidth)}${bar(activity.tokens, maxTokens, barWidth)} ${details.get(day).padStart(detailWidth)}`;
    lines.push(boxedLine(line, innerWidth));
  }
}

export function plainWeeklyActivitySection(sessions) {
  const counts = weeklyActivity(sessions);
  const details = activityDetails(counts, fmtInt, "messages");
  const maxTokens = Math.max(...[...counts.values()].map((activity) => activity.tokens), 0);
  const lines = ["Weekly activity", ""];

  if (maxTokens === 0 && [...counts.values()].every((activity) => activity.messages === 0)) {
    lines.push("none");
    return lines;
  }

  for (const [day, activity] of counts) {
    lines.push(`${day.padEnd(3)}  ${bar(activity.tokens, maxTokens, 28)}  ${details.get(day)}`);
  }
  return lines;
}

export function reportScopeLabel(scope) {
  return scope.type === "folder"
    ? `folder ${shortPath(scope.root)}`
    : scope.label;
}

export function reportPeriodLabel(start, end, sessions) {
  const firstDay = sessions.reduce((earliest, session) => (
    earliest == null || session.firstTs < earliest ? session.firstTs : earliest
  ), null) ?? end;
  return `${localDay(start ?? firstDay)} → ${localDay(end)}`;
}

export function plainReportHeader({ args, scope, start, end, sessions }) {
  return [
    `Agents  ${args.agent === "all" ? "codex, claude" : args.agent}`,
    `Scope   ${reportScopeLabel(scope)}`,
    `Period  ${reportPeriodLabel(start, end, sessions)}`,
  ];
}

export function activityInsightsSection(lines, insights, reasoningEfforts, innerWidth, limit = reasoningEfforts.size) {
  lines.push(boxedLine("Activity insights", innerWidth));
  lines.push(infoLine("  Fast mode", insights.fastModePercent == null ? "unavailable" : `${insights.fastModePercent}% of known turns`, innerWidth));
  lines.push(boxedBlank(innerWidth));
  if (reasoningEfforts.size === 0) lines.push(infoLine("Reasoning", "unavailable", innerWidth));
  else topSection(lines, "Reasoning efforts", reasoningEfforts, limit, "turns", innerWidth);
}

export function plainActivityInsightsSection(insights, reasoningEfforts, limit = reasoningEfforts.size) {
  return [
    "Activity insights",
    "",
    `Fast mode            ${insights.fastModePercent == null ? "unavailable" : `${insights.fastModePercent}% of known turns`}`,
    "",
    ...plainTopSection("Reasoning efforts", reasoningEfforts, limit, "turns", { emptyText: "unavailable" }),
    "",
    "Locally derived from recorded settings; percentages use known settings only.",
  ];
}

function summaryHeader({ args, scope, start, end, sessions, projects, repositories, messages }, innerWidth) {
  const totalMessages = (messages.get("user") ?? 0) + (messages.get("assistant") ?? 0);
  const lines = [boxedTitle("codex-report", innerWidth)];

  lines.push(infoLine("Agents", args.agent === "all" ? "codex, claude" : args.agent, innerWidth));
  lines.push(infoLine("Scope", reportScopeLabel(scope), innerWidth));
  lines.push(infoLine("Period", reportPeriodLabel(start, end, sessions), innerWidth));
  lines.push(infoLine("Sessions", fmtInt(sessions.length), innerWidth));
  if (scope.type === "global") {
    lines.push(infoLine("Projects", fmtInt(projects.size), innerWidth));
    lines.push(infoLine("Repos/dirs", fmtInt(repositories.size), innerWidth));
  }
  lines.push(infoLine("Messages", `${fmtInt(totalMessages)} (${fmtInt(messages.get("user") ?? 0)} user, ${fmtInt(messages.get("assistant") ?? 0)} assistant)`, innerWidth));
  return lines;
}

function appendTokenSummary(lines, { tokens, costEstimate }, innerWidth) {
  lines.push(infoLine("Tokens", `${fmtInt(tokens.total_tokens)} total`, innerWidth));
  lines.push(infoLine("", `${fmtInt(tokens.input_tokens)} input · ${fmtInt(tokens.cached_input_tokens)} cached · ${fmtInt(tokens.output_tokens)} output`, innerWidth));
  lines.push(infoLine("API cost", `${fmtUSD(costEstimate.totalCost)} estimated from priced local tokens`, innerWidth));
  if (tokenVolume(costEstimate.unpricedTokens) > 0) {
    lines.push(infoLine("", `${fmtCompact(tokenVolume(costEstimate.unpricedTokens))} tokens in unpriced models`, innerWidth));
  }
}

function appendActivitySummary(lines, { daySessions, activeDays }, innerWidth) {
  const busiestDay = sortedActivity(daySessions)[0] ?? ["none", { messages: 0, tokens: 0 }];
  lines.push(infoLine("Active days", `${fmtInt(activeDays.size)} · longest streak ${fmtInt(longestStreak(activeDays))} days`, innerWidth));
  lines.push(infoLine("Busiest day", `${busiestDay[0]} (${fmtCompact(busiestDay[1].tokens)} tokens)`, innerWidth));
  lines.push(boxedBlank(innerWidth));
}

export function renderReport({ args, agentSummaries, scope, start, end, sessions, daySessions, activeDays, tokens, messages, tools, projects, repositories, providers, sources, models, insights, reasoningEfforts, costEstimate }) {
  const width = terminalWidth();
  const innerWidth = width - 4;
  const lines = summaryHeader({ args, scope, start, end, sessions, projects, repositories, messages }, innerWidth);
  appendTokenSummary(lines, { tokens, costEstimate }, innerWidth);
  appendActivitySummary(lines, { daySessions, activeDays }, innerWidth);
  if (args.agent === "all") {
    for (const line of plainAgentSection(agentSummaries)) lines.push(boxedLine(truncate(line, innerWidth), innerWidth));
    lines.push(boxedBlank(innerWidth));
  }

  activityInsightsSection(lines, insights, reasoningEfforts, innerWidth, args.top);
  lines.push(boxedBlank(innerWidth));
  weeklyActivitySection(lines, sessions, innerWidth);
  lines.push(boxedBlank(innerWidth));
  if (scope.type === "global") {
    topSection(lines, "Top repositories and directories", repositories, args.top, "sessions", innerWidth);
    lines.push(boxedBlank(innerWidth));
  }

  topSection(lines, "Top models", models, args.top, "turns", innerWidth);
  lines.push(boxedBlank(innerWidth));
  costSection(lines, "Estimated API cost by model", costEstimate, args.top, innerWidth);
  lines.push(boxedBlank(innerWidth));
  topSection(lines, "Top tools", tools, args.top, "calls", innerWidth);
  lines.push(boxedBlank(innerWidth));
  activitySection(lines, "Activity by day", daySessions, args.top, innerWidth);
  lines.push(boxedBlank(innerWidth));
  activitySection(lines, "Activity by month", monthlyActivity(daySessions), args.top, innerWidth);
  lines.push(boxedBlank(innerWidth));
  topSection(lines, "Sources", sources, args.top, "sessions", innerWidth);
  lines.push(boxedBlank(innerWidth));
  topSection(lines, "Providers", providers, args.top, "sessions", innerWidth);
  lines.push(boxedFooter(innerWidth));

  return lines.join("\n");
}

const SECTION_RENDERERS = new Map([
  ["agents", (r) => plainAgentSection(r.agentSummaries)],
  ["weekly", (r) => plainWeeklyActivitySection(r.sessions)],
  ["monthly", (r) => plainActivitySection("Activity by month", monthlyActivity(r.daySessions), r.args.top)],
  ["projects", (r) => r.scope.type === "global"
    ? plainTopSection("Top projects", r.projects, r.args.top, "sessions")
    : ["Top projects", "", "current folder scope; use --global to compare projects"]],
  ["repositories", (r) => plainTopSection("Repositories and directories", r.repositories, r.args.top, "sessions")],
  ["models", (r) => plainTopSection("Top models", r.models, r.args.top, "turns")],
  ["tools", (r) => plainTopSection("Top tools", r.tools, r.args.top, "calls")],
  ["activity", (r) => plainActivitySection("Activity by day", r.daySessions, r.args.top)],
  ["sources", (r) => plainTopSection("Sources", r.sources, r.args.top, "sessions")],
  ["providers", (r) => plainTopSection("Providers", r.providers, r.args.top, "sessions")],
  ["costs", (r) => plainCostSection(r.costEstimate, r.args.top)],
  ["insights", (r) => plainActivityInsightsSection(r.insights, r.reasoningEfforts, r.args.top)],
  ["skills", (r) => plainSkillsSection(r.skillAnalysis, r.args.top)],
]);

export function renderPlainSections(report) {
  const sections = [plainReportHeader(report), ...report.args.sections.map((section) => SECTION_RENDERERS.get(section)(report))];
  return sections.map((lines) => lines.join("\n")).join("\n\n");
}

function plainAgentSection(summaries) {
  return ["Agents", "", ...summaries.map((summary) => `${summary.agent}  ${fmtInt(summary.sessions)} sessions · ${fmtInt(summary.messages)} messages · ${fmtCompact(summary.tokens.total_tokens)} tokens · ${fmtUSD(summary.costEstimate.totalCost)} estimated API cost`)];
}
