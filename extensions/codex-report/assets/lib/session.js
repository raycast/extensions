import { localDay, increment, mapEntries, mapFromEntries } from "./utils.js";
import { emptySkillEvidence, emptyRawSkillEvidence, recordSkillRead } from "./skills.js";

// These subsets retain per-request tier decisions when model totals are merged.
export const LONG_CONTEXT_TOKEN_KEYS = [
  "input_tokens", "cached_input_tokens", "cache_creation_input_tokens",
  "cache_creation_1h_input_tokens", "output_tokens",
];
export const TOKEN_KEYS = [
  "input_tokens",
  "cached_input_tokens",
  "cache_write_input_tokens",
  "cache_creation_input_tokens",
  "cache_creation_1h_input_tokens",
  "cache_creation_unknown_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
  ...LONG_CONTEXT_TOKEN_KEYS.map((key) => `long_context_${key}`),
];
export function emptyTokens() {
  return Object.fromEntries(TOKEN_KEYS.map((key) => [key, 0]));
}

export function addTokens(total, usage) {
  if (!usage) {
    return;
  }

  for (const key of TOKEN_KEYS) {
    total[key] = (total[key] ?? 0) + Number(usage[key] ?? 0);
  }
}

export function tokenDelta(current, previous) {
  if (!current) {
    return null;
  }

  const delta = emptyTokens();
  for (const key of TOKEN_KEYS) {
    const diff = Number(current[key] ?? 0) - Number(previous?.[key] ?? 0);
    if (diff < 0) {
      return null;
    }
    delta[key] = diff;
  }
  return delta;
}

export function addModelTokens(map, model, usage) {
  const key = model ?? "(unknown)";
  if (!map.has(key)) {
    map.set(key, emptyTokens());
  }
  addTokens(map.get(key), usage);
}

export function mergeTokenMaps(target, source) {
  for (const [key, usage] of source) {
    addModelTokens(target, key, usage);
  }
}

export function tokenVolume(tokens) {
  return tokens.total_tokens
    || tokens.input_tokens + tokens.output_tokens
    || 0;
}

export function sessionMessageCount(session) {
  return (session.messages.get("user") ?? 0) + (session.messages.get("assistant") ?? 0);
}

export function sessionTokenCount(session) {
  return session.tokens.total_tokens ?? 0;
}

export function hasActivity(session) {
  return sessionMessageCount(session) > 0 || sessionTokenCount(session) > 0 || session.tools.size > 0;
}

export function serializeDailySession(session) {
  return {
    ...session,
    firstTs: session.firstTs?.toISOString() ?? null,
    lastTs: session.lastTs?.toISOString() ?? null,
    messages: mapEntries(session.messages),
    tools: mapEntries(session.tools),
    modelTokens: mapEntries(session.modelTokens),
    models: mapEntries(session.models),
    serviceTiers: mapEntries(session.serviceTiers),
    reasoningEfforts: mapEntries(session.reasoningEfforts),
    rawSkillEvidence: {
      reads: mapEntries(session.rawSkillEvidence?.reads),
      mentions: mapEntries(session.rawSkillEvidence?.mentions),
    },
  };
}

export function deserializeDailySession(value) {
  return {
    ...value,
    firstTs: value.firstTs ? new Date(value.firstTs) : null,
    lastTs: value.lastTs ? new Date(value.lastTs) : null,
    messages: mapFromEntries(value.messages),
    tools: mapFromEntries(value.tools),
    modelTokens: mapFromEntries(value.modelTokens),
    models: mapFromEntries(value.models),
    serviceTiers: mapFromEntries(value.serviceTiers),
    reasoningEfforts: mapFromEntries(value.reasoningEfforts),
    rawSkillEvidence: {
      reads: mapFromEntries(value.rawSkillEvidence?.reads),
      mentions: mapFromEntries(value.rawSkillEvidence?.mentions),
    },
  };
}

export function serializeParsedSession(session) {
  return {
    ...session,
    turnIds: [...session.turnIds],
    days: mapEntries(new Map(
      [...session.days].map(([day, value]) => [day, serializeDailySession(value)]),
    )),
  };
}

export function deserializeParsedSession(value) {
  return {
    ...value,
    turnIds: new Set(value.turnIds ?? []),
    days: new Map(
      (value.days ?? []).map(([day, session]) => [day, deserializeDailySession(session)]),
    ),
  };
}

export function emptyDailySession() {
  return {
    firstTs: null,
    lastTs: null,
    messages: new Map(),
    tools: new Map(),
    tokens: emptyTokens(),
    modelTokens: new Map(),
    models: new Map(),
    serviceTiers: new Map(),
    reasoningEfforts: new Map(),
    rawSkillEvidence: emptyRawSkillEvidence(),
    tokenEvents: 0,
  };
}

export function dailySessionFor(days, ts) {
  const day = ts ? localDay(ts) : "(undated)";
  if (!days.has(day)) {
    days.set(day, emptyDailySession());
  }
  const session = days.get(day);
  if (ts) {
    session.firstTs = session.firstTs == null || ts < session.firstTs ? ts : session.firstTs;
    session.lastTs = session.lastTs == null || ts > session.lastTs ? ts : session.lastTs;
  }
  return session;
}


function mergeDailySkillEvidence(target, source, skillRegistry) {
  for (const [skillPath, count] of source.rawSkillEvidence?.reads ?? []) recordSkillRead(target, skillRegistry, skillPath, count);
  for (const [name, count] of source.rawSkillEvidence?.mentions ?? []) {
    const skill = skillRegistry?.byName.get(name);
    if (!skill) continue;
    increment(target.mentions, name, count);
    target.names.set(name, name);
    target.scopes.set(name, skill.scope);
  }
}

function mergeDailyCounters(target, source) {
  addTokens(target.tokens, source.tokens);
  for (const field of ["messages", "tools", "models", "serviceTiers", "reasoningEfforts"]) {
    for (const [key, value] of source[field]) increment(target[field], key, value);
  }
  mergeTokenMaps(target.modelTokens, source.modelTokens);
  target.tokenEvents += source.tokenEvents ?? 0;
}

export function mergeDailySession(target, source, skillRegistry) {
  mergeDailyCounters(target, source);
  mergeDailySkillEvidence(target.skillEvidence, source, skillRegistry);
}

// Merges unresolved parsed days, e.g. a subagent thread into its root session.
export function mergeParsedDays(target, source) {
  for (const [day, daily] of source) {
    const into = target.get(day);
    if (!into) { target.set(day, daily); continue; }
    mergeDailyCounters(into, daily);
    for (const field of ["reads", "mentions"]) {
      for (const [key, value] of daily.rawSkillEvidence[field]) increment(into.rawSkillEvidence[field], key, value);
    }
    if (daily.firstTs && (!into.firstTs || daily.firstTs < into.firstTs)) into.firstTs = daily.firstTs;
    if (daily.lastTs && (!into.lastTs || daily.lastTs > into.lastTs)) into.lastTs = daily.lastTs;
  }
}

function dayInRange(day, daily, start, end) {
  if (day === "(undated)") return true;
  return !(start && daily.lastTs < start) && !(end && daily.firstTs > end);
}

function includeDailySession(session, day, daily, skillRegistry) {
  if (daily.firstTs) {
    if (session.firstTs == null || daily.firstTs < session.firstTs) session.firstTs = daily.firstTs;
    if (session.lastTs == null || daily.lastTs > session.lastTs) session.lastTs = daily.lastTs;
  }
  session.days.set(day, daily);
  mergeDailySession(session, daily, skillRegistry);
}

export function materializeSession(parsed, start, end, skillRegistry) {
  const session = {
    agent: parsed.agent,
    path: parsed.path,
    id: parsed.id,
    firstTs: null,
    lastTs: null,
    cwd: parsed.cwd,
    repositoryUrl: parsed.repositoryUrl,
    provider: parsed.provider,
    source: parsed.source,
    messages: new Map(),
    tools: new Map(),
    tokens: emptyTokens(),
    modelTokens: new Map(),
    models: new Map(),
    serviceTiers: new Map(),
    reasoningEfforts: new Map(),
    skillEvidence: emptySkillEvidence(),
    tokenEvents: 0,
    days: new Map(),
  };

  for (const [day, daily] of parsed.days) {
    if (dayInRange(day, daily, start, end)) includeDailySession(session, day, daily, skillRegistry);
  }

  return session.firstTs ? session : null;
}

export function resolveSessionSkills(session, skillRegistry) {
  session.skillEvidence = emptySkillEvidence();
  for (const daily of session.days.values()) mergeDailySkillEvidence(session.skillEvidence, daily, skillRegistry);
}
