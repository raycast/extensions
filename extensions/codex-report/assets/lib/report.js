import { aggregateRepositories } from "./repositories.js";
import { readParsedSessions } from "./cache.js";
import { agentAdapters } from "./adapters/index.js";
import { resolveScope, isInsideFolder } from "./scope.js";
import { discoverSkills, aggregateSkills } from "./skills.js";
import { TOKEN_KEYS, materializeSession, hasActivity, resolveSessionSkills, emptyTokens, sessionMessageCount, sessionTokenCount, mergeTokenMaps } from "./session.js";
import { parseDate, localDay, increment, sumMapValues } from "./utils.js";
import { shortPath } from "./format.js";
import { estimateCosts, costSummary } from "./pricing.js";

async function loadSessions(adapters, args, start, end) {
  const sessions = [];
  const availability = [];
  const cacheSupportsRange = !args.from?.includes("T") && !args.to?.includes("T");
  for (const adapter of adapters) {
    const files = await adapter.discover();
    if (files.length === 0) console.error(`No local ${adapter.name} transcripts found.`);
    availability.push({ agent: adapter.id, files: files.length });
    const parsed = await readParsedSessions(adapter, files, {
      start, end, useCache: args.cache && cacheSupportsRange,
      requireInsights: args.json || args.sections.length === 0 || args.sections.includes("insights"),
    });
    for (const summary of parsed) {
      const session = materializeSession(summary, start, end, null);
      if (session && hasActivity(session)) sessions.push(session);
    }
  }
  return { sessions, availability };
}

function scopedSessions(allSessions, scope) {
  if (scope.type === "global") return { sessions: allSessions, scope };
  const sessions = allSessions.filter((session) => isInsideFolder(session.cwd, scope.root));
  if (sessions.length > 0) return { sessions, scope };
  return {
    sessions: allSessions,
    scope: { type: "global", label: `global (no sessions in folder ${shortPath(scope.root)})` },
  };
}

function aggregateDays(session, { daySessions, dayModelTokens, activeDays }) {
  for (const [day, daily] of session.days) {
    if (!hasActivity(daily)) continue;
    if (!daySessions.has(day)) daySessions.set(day, { messages: 0, tokens: 0 });
    daySessions.get(day).messages += sessionMessageCount(daily);
    daySessions.get(day).tokens += sessionTokenCount(daily);
    if (!dayModelTokens.has(day)) dayModelTokens.set(day, new Map());
    mergeTokenMaps(dayModelTokens.get(day), daily.modelTokens);
    if (day !== "(undated)") activeDays.add(day);
  }
}

function aggregateSession(session, state) {
  for (const key of TOKEN_KEYS) state.tokens[key] += session.tokens[key] ?? 0;
  for (const field of ["messages", "tools", "models", "serviceTiers", "reasoningEfforts"]) {
    for (const [key, value] of session[field]) increment(state[field], key, value);
  }
  mergeTokenMaps(state.modelTokens, session.modelTokens);
  increment(state.projects, session.cwd);
  increment(state.providers, session.provider);
  increment(state.sources, session.source);
}

function agentSummaries(sessions) {
  const summaries = new Map();
  for (const session of sessions) {
    if (!summaries.has(session.agent)) summaries.set(session.agent, { agent: session.agent, sessions: 0, messages: 0, tokens: emptyTokens(), modelTokens: new Map() });
    const summary = summaries.get(session.agent);
    summary.sessions += 1;
    summary.messages += sessionMessageCount(session);
    for (const key of TOKEN_KEYS) summary.tokens[key] += session.tokens[key] ?? 0;
    mergeTokenMaps(summary.modelTokens, session.modelTokens);
  }
  return [...summaries.values()].map(({ modelTokens, ...summary }) => ({ ...summary, costEstimate: estimateCosts(modelTokens) }));
}

// Per-agent contributions let clients stack activity without changing daily totals.
function agentActivityDays(sessions) {
  const days = new Map();
  for (const session of sessions) {
    for (const [date, daily] of session.days) {
      if (!hasActivity(daily)) continue;
      const key = `${date}:${session.agent}`;
      if (!days.has(key)) days.set(key, { date, agent: session.agent, messages: 0, tokens: 0, modelTokens: new Map() });
      const activity = days.get(key);
      activity.messages += sessionMessageCount(daily);
      activity.tokens += sessionTokenCount(daily);
      mergeTokenMaps(activity.modelTokens, daily.modelTokens);
    }
  }
  return [...days.values()].map(({ modelTokens, ...activity }) => ({ ...activity, cost: costSummary(modelTokens) })).sort((a, b) => a.date.localeCompare(b.date) || a.agent.localeCompare(b.agent));
}

function activityInsights(serviceTiers, reasoningEfforts) {
  const knownServiceTierTurns = sumMapValues(serviceTiers);
  return {
    fastModePercent: knownServiceTierTurns > 0 ? Math.round(((serviceTiers.get("priority") ?? 0) / knownServiceTierTurns) * 100) : null,
    knownServiceTierTurns,
    knownReasoningEffortTurns: sumMapValues(reasoningEfforts),
  };
}

function reportRange(args) {
  const start = parseDate(args.from);
  const end = parseDate(args.to ?? localDay(new Date()), { endOfDay: !args.to?.includes("T") });
  if (!end) throw new Error("--to requires a date");
  if (start && start > end) throw new Error("--from must not be later than --to");
  return { start, end };
}

export async function buildReport(args) {
  const adapters = agentAdapters(args.agent);
  const initialScope = resolveScope(args.global);
  const { start, end } = reportRange(args);
  // Section flags (also with --json) skip the slow skill and git repository lookups unless requested.
  const wantsSkills = args.sections.includes("skills") || (args.json && args.sections.length === 0);
  const wantsRepositories = args.sections.length === 0 || args.sections.includes("repositories");
  const loaded = await loadSessions(adapters, args, start, end);
  const { sessions, scope } = scopedSessions(loaded.sessions, initialScope);
  const projectDirectories = [...new Set(sessions.map((session) => session.cwd))].filter((cwd) => cwd !== "(unknown)");
  const skillRegistry = wantsSkills ? await discoverSkills(scope, adapters, projectDirectories) : null;
  if (wantsSkills) for (const session of sessions) resolveSessionSkills(session, skillRegistry);
  const { repositories, repositoryModelTokens } = wantsRepositories
    ? await aggregateRepositories(sessions)
    : { repositories: new Map(), repositoryModelTokens: new Map() };
  const daySessions = new Map();
  const dayModelTokens = new Map();
  const activeDays = new Set();
  const tokens = emptyTokens();
  const messages = new Map();
  const tools = new Map();
  const projects = new Map();
  const providers = new Map();
  const sources = new Map();
  const models = new Map();
  const modelTokens = new Map();
  const serviceTiers = new Map();
  const reasoningEfforts = new Map();

  const state = { daySessions, dayModelTokens, activeDays, tokens, messages, tools, projects, providers, sources, models, modelTokens, serviceTiers, reasoningEfforts };
  for (const session of sessions) {
    aggregateDays(session, state);
    aggregateSession(session, state);
  }
  return {
    ...state, args, scope, start, end, sessions, repositories, repositoryModelTokens,
    agentSummaries: agentSummaries(sessions),
    agentDays: args.json ? agentActivityDays(sessions) : [],
    selectedAgents: adapters.map((adapter) => adapter.id), availability: loaded.availability,
    insights: activityInsights(serviceTiers, reasoningEfforts),
    costEstimate: estimateCosts(modelTokens),
    skillAnalysis: aggregateSkills(wantsSkills ? sessions : [], skillRegistry ?? { byName: new Map() }),
  };
}
