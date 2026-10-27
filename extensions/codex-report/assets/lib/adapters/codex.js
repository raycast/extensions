import os from "node:os";
import path from "node:path";
import { sessionFiles, jsonlEvents } from "../files.js";
import { parseTimestamp, label, increment } from "../utils.js";
import { emptyTokens, dailySessionFor, tokenDelta, addTokens, addModelTokens, tokenVolume, mergeParsedDays } from "../session.js";
import { recordRawSkillMentions, parseFunctionArguments, skillReadPathsFromCommand } from "../skills.js";
const INSIGHTS_CACHE_VERSION = 2;

export function completedMessage(payload) {
  if (payload.type === "user_message") return { role: "user", text: payload.message };
  if (payload.type === "agent_message") return { role: "assistant" };
  if (payload.type !== "item_completed") return null;
  const item = payload.item;
  if (item?.type === "AgentMessage") return { role: "assistant" };
  if (item?.type !== "UserMessage") return null;
  return {
    role: "user",
    text: (item.content ?? []).map((part) => part.text ?? "").join("\n"),
  };
}


function recordMetadata(state, payload, parents) {
  if (state.hasCanonicalMeta) return;
  Object.assign(state.meta, payload);
  state.hasCanonicalMeta = true;
  state.inheritedTurnIds = parents.get(payload.forked_from_id) ?? null;
  state.replayingForkHistory = Boolean(state.inheritedTurnIds?.size);
  state.automatic = payload.thread_source === "guardian_review" || payload.source?.subagent?.other === "guardian";
}

function recordTurnIdentity(state, payload) {
  if (!payload.turn_id) return;
  state.turnIds.add(payload.turn_id);
  if (state.replayingForkHistory && !state.inheritedTurnIds.has(payload.turn_id)) state.replayingForkHistory = false;
}

function updateTurnSettings(state, payload) {
  state.effort = payload.effort ?? payload.collaboration_mode?.settings?.reasoning_effort ?? state.effort;
  state.model = payload.model ?? state.model;
}

function updateBaseline(state, eventType, payload) {
  if (eventType === "turn_context") updateTurnSettings(state, payload);
  if (eventType !== "event_msg") return;
  state.tier = payload.thread_settings?.service_tier ?? state.tier;
  if (payload.type === "token_count" && payload.info?.total_token_usage) state.previousUsage = payload.info.total_token_usage;
}

function recordTurn(state, payload, daily) {
  updateTurnSettings(state, payload);
  if (state.tier) increment(daily.serviceTiers, state.tier);
  if (state.effort) increment(daily.reasoningEfforts, state.effort);
  if (payload.model) increment(daily.models, payload.model);
}

function recordUsage(state, info, daily) {
  const total = info?.total_token_usage;
  const usage = total ? tokenDelta(total, state.previousUsage) ?? info?.last_token_usage : info?.last_token_usage;
  if (total) state.previousUsage = total;
  if (!usage) return;
  addTokens(daily.tokens, usage);
  addModelTokens(daily.modelTokens, state.model, usage);
  if (tokenVolume(usage) > 0) daily.tokenEvents += 1;
}

function recordEventMessage(state, payload, daily) {
  state.tier = payload.thread_settings?.service_tier ?? state.tier;
  const message = completedMessage(payload);
  if (message) {
    increment(daily.messages, message.role);
    if (message.role === "user") recordRawSkillMentions(daily.rawSkillEvidence, message.text);
    return;
  }
  if (payload.type === "token_count") recordUsage(state, payload.info, daily);
}

function recordTool(state, payload, daily) {
  if (!["function_call", "custom_tool_call"].includes(payload.type)) return;
  increment(daily.tools, payload.name ?? payload.type);
  const args = parseFunctionArguments(payload.arguments);
  for (const skillPath of skillReadPathsFromCommand(args.cmd ?? args.command ?? "")) increment(daily.rawSkillEvidence.reads, skillPath);
}

const EVENT_HANDLERS = new Map([
  ["turn_context", recordTurn], ["event_msg", recordEventMessage], ["response_item", recordTool],
]);
// Automatic Guardian reviews add tokens and costs, not turns, messages or tool calls.
const AUTOMATIC_HANDLERS = new Map([
  ["turn_context", updateTurnSettings],
  ["event_msg", (state, payload, daily) => { if (payload.type === "token_count") recordUsage(state, payload.info, daily); }],
]);

function consumeEvent(state, event, parents, start, end) {
  const payload = event.payload ?? {};
  if (event.type === "session_meta") recordMetadata(state, payload, parents);
  if (event.type === "turn_context") recordTurnIdentity(state, payload);
  const ts = parseTimestamp(event.timestamp);
  const excluded = ts && ((start && ts < start) || (end && ts > end));
  if (state.replayingForkHistory || excluded) { updateBaseline(state, event.type, payload); return; }
  const daily = dailySessionFor(state.days, ts);
  (state.automatic ? AUTOMATIC_HANDLERS : EVENT_HANDLERS).get(event.type)?.(state, payload, daily);
}

export async function parseSessionFile(filePath, parents, start = null, end = null) {
  const state = {
    meta: {}, days: new Map(), turnIds: new Set(), hasCanonicalMeta: false,
    model: null, tier: null, effort: null, previousUsage: emptyTokens(),
    inheritedTurnIds: null, replayingForkHistory: false, automatic: false,
  };
  for await (const event of jsonlEvents(filePath)) consumeEvent(state, event, parents, start, end);
  const { meta, days, turnIds } = state;
  // Out-of-range parents still supply IDs used to skip fork history.
  if (meta.id) parents.set(meta.id, turnIds);
  if (![...days.values()].some((day) => day.firstTs)) return null;
  return {
    agent: "codex", path: filePath,
    id: meta.id ?? path.basename(filePath).replace(/\.jsonl(?:\.zst)?$/, ""),
    forkedFromId: meta.forked_from_id ?? null, turnIds,
    parentSessionId: meta.source?.subagent ? meta.session_id ?? meta.parent_thread_id ?? null : null,
    cwd: label(meta.cwd),
    repositoryUrl: typeof meta.git?.repository_url === "string" ? meta.git.repository_url : null,
    provider: label(meta.model_provider), source: label(meta.originator ?? meta.source),
    insightsVersion: INSIGHTS_CACHE_VERSION, timeZone: localTimeZone(), days,
  };
}

// Parsed days are local dates, so a cached session is only valid in the time zone it was grouped in.
const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Subagent threads, including Guardian reviews, belong to their root session like Claude
// subagents; user forks stay separate sessions. Orphans keep the recorded root ID.
function reconcileCodexSessions(parsedSessions) {
  const roots = new Map(parsedSessions.filter((parsed) => !parsed.parentSessionId).map((parsed) => [parsed.id, parsed]));
  const sessions = new Map();
  for (const parsed of parsedSessions) {
    const id = parsed.parentSessionId ?? parsed.id;
    if (!sessions.has(id)) sessions.set(id, { ...(roots.get(id) ?? parsed), id, days: new Map() });
    mergeParsedDays(sessions.get(id).days, parsed.days);
  }
  return [...sessions.values()];
}

// Rollouts live under sessions/YYYY/MM/DD (local date) and are named after their thread ID.
function createdAt(file) {
  const date = file.match(/(\d{4})[\\/](\d{2})[\\/](\d{2})[\\/][^\\/]+$/);
  return date ? new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : null;
}

function threadId(file) {
  return path.basename(file).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl(?:\.zst)?$/)?.[1] ?? null;
}

export function codexAdapter() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return {
    id: "codex",
    name: "Codex",
    cacheVersion: 10,
    insightsVersion: INSIGHTS_CACHE_VERSION,
    cachePath: path.join(home, "cache", "codex-report-sessions-v10.json"),
    cachePattern: /^codex-report-sessions-v\d+\.json$/,
    skillRoots: [path.join(home, "skills"), path.join(home, "plugins", "cache")],
    projectSkillRoots: [".agents/skills"],
    discover: () => sessionFiles(path.join(home, "sessions")),
    parse: parseSessionFile,
    reconcile: reconcileCodexSessions,
    cacheValid: (parsed) => parsed.timeZone === localTimeZone(),
    createdAt,
    fileId: threadId,
    // Forks replay parent turns with new timestamps; parent turn IDs identify that history.
    references: (parsed) => parsed.forkedFromId ? [parsed.forkedFromId] : [],
    parseUsesContext: true,
  };
}
