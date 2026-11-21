import os from "node:os";
import path from "node:path";
import { jsonlEvents, sessionFiles } from "../files.js";
import { parseTimestamp, label, increment } from "../utils.js";
import { emptyTokens, dailySessionFor, addTokens, addModelTokens, LONG_CONTEXT_TOKEN_KEYS } from "../session.js";
import { normalizeModelName } from "../pricing.js";
import { normalizeSkillPath, skillReadPathsFromCommand } from "../skills.js";

function count(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeClaudeIteration(usage, model) {
  const tokens = emptyTokens();
  const writes = count(usage.cache_creation_input_tokens);
  const oneHour = Math.min(writes, count(usage.cache_creation?.ephemeral_1h_input_tokens));
  const fiveMinute = Math.min(writes - oneHour, count(usage.cache_creation?.ephemeral_5m_input_tokens));
  tokens.cached_input_tokens = count(usage.cache_read_input_tokens);
  tokens.cache_creation_input_tokens = writes;
  tokens.cache_creation_1h_input_tokens = oneHour;
  tokens.cache_creation_unknown_input_tokens = writes - oneHour - fiveMinute;
  tokens.input_tokens = count(usage.input_tokens) + tokens.cached_input_tokens + writes;
  tokens.output_tokens = count(usage.output_tokens);
  tokens.reasoning_output_tokens = count(usage.output_tokens_details?.thinking_tokens);
  tokens.total_tokens = tokens.input_tokens + tokens.output_tokens;
  if (normalizeModelName(model) === "claude-haiku-5-5" && tokens.input_tokens > 100_000) {
    for (const key of LONG_CONTEXT_TOKEN_KEYS) tokens[`long_context_${key}`] = tokens[key];
  }
  return tokens;
}

function normalizeClaudeUsage(usage, model) {
  const iterations = Array.isArray(usage.iterations)
    ? usage.iterations.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    : [];
  const modelTokens = new Map();
  // Top-level usage repeats executor work; iterations also include compaction and advisors.
  for (const iteration of iterations.length ? iterations : [usage]) {
    const iterationModel = iteration.type === "advisor_message" ? label(iteration.model) : label(iteration.model ?? model);
    addModelTokens(modelTokens, iterationModel, normalizeClaudeIteration(iteration, iterationModel));
  }
  const executor = modelTokens.get(label(model));
  if (executor) executor.reasoning_output_tokens = Math.max(executor.reasoning_output_tokens, count(usage.output_tokens_details?.thinking_tokens));
  const tokens = emptyTokens();
  for (const modelUsage of modelTokens.values()) addTokens(tokens, modelUsage);
  return { tokens, modelTokens: [...modelTokens] };
}

export function normalizeClaudeTokens(usage, model) {
  return normalizeClaudeUsage(usage, model).tokens;
}

function providerFor(event) {
  const explicit = event.modelProvider ?? event.provider ?? event.message?.provider;
  if (typeof explicit === "string") return explicit;
  const model = event.message?.model ?? "";
  if (model.includes("@") || event.message?.id?.includes("_vrtx_")) return "vertex";
  if (model.includes("anthropic.") || model.startsWith("arn:aws:")) return "bedrock";
  // A Claude model name alone does not identify the host (proxies can reuse it).
  return "(unknown)";
}

function sessionOwner(filePath) {
  const parts = filePath.split(path.sep);
  const subagents = parts.lastIndexOf("subagents");
  if (subagents >= 0) return { id: parts[subagents - 1], subagent: true };
  return { id: path.basename(filePath, ".jsonl"), subagent: /^agent-/.test(path.basename(filePath)) };
}

function contentBlocks(message) {
  if (Array.isArray(message?.content)) return message.content.filter((b) => b && typeof b === "object");
  return typeof message?.content === "string" ? [{ type: "text", text: message.content }] : [];
}

function userMentions(blocks) {
  const names = new Set();
  for (const block of blocks) {
    if (block.type !== "text") continue;
    for (const match of String(block.text ?? "").matchAll(/(?:\$|^\/)([A-Za-z0-9][A-Za-z0-9:_-]*)/gm)) names.add(match[1]);
  }
  return [...names];
}

function skillPaths(tool, cwd) {
  if (tool.name === "Bash") return skillReadPathsFromCommand(tool.input?.command ?? "");
  if (tool.name !== "Read") return [];
  const file = tool.input?.file_path;
  if (typeof file !== "string" || path.basename(file) !== "SKILL.md") return [];
  return [normalizeSkillPath(path.isAbsolute(file) || file.startsWith("~/") ? file : path.resolve(cwd, file))];
}

function toolRecords(blocks, event, cwd) {
  return blocks.filter((b) => b.type === "tool_use").map((b, index) => ({
    id: b.id ?? `${event.uuid}:tool:${index}`,
    timestamp: event.timestamp,
    name: label(b.name),
    reads: skillPaths(b, cwd),
    // The Skill tool records explicit invocations without reading SKILL.md.
    mentions: b.name === "Skill" && typeof b.input?.skill === "string" ? [b.input.skill] : [],
  }));
}


function recordMetadata(event, filePath, owner, index, timestamp) {
  return {
    timestamp: timestamp.toISOString(), uuid: event.uuid ?? `${filePath}:${index}`,
    sessionId: event.sessionId ?? owner.id,
    cwd: typeof event.cwd === "string" ? event.cwd : "(unknown)",
    subagent: owner.subagent || event.isSidechain === true,
    source: label(event.entrypoint ?? "Claude Code"), provider: providerFor(event),
  };
}

function userRecord(base, blocks) {
  if (!blocks.some((block) => ['text', 'image', 'document'].includes(block.type))) return null;
  return { ...base, type: "user", key: `user:${base.uuid}`, mentions: userMentions(blocks) };
}

function recordedTier(usage) {
  if (usage?.speed === "fast") return "priority";
  if (usage?.speed === "standard") return "default";
  return null;
}

function assistantRecord(base, event, blocks) {
  const message = event.message ?? {};
  if (message.model === "<synthetic>" || event.isApiErrorMessage) return null;
  const key = message.id ? `assistant:${message.id}:${event.requestId ?? ""}` : `assistant:${base.uuid}`;
  const usage = message.usage ? normalizeClaudeUsage(message.usage, message.model) : { tokens: null, modelTokens: [] };
  return {
    ...base, type: "assistant", key, model: label(message.model),
    tokens: usage.tokens, modelTokens: usage.modelTokens,
    effort: event.perTurnEffort ?? event.effort ?? null,
    tier: recordedTier(message.usage),
    text: blocks.some((block) => block.type === "text" && String(block.text ?? "").trim() !== ""),
    tools: toolRecords(blocks, { ...event, uuid: base.uuid }, base.cwd),
  };
}

function normalizedRecord(event, filePath, owner, index) {
  if (!['user', 'assistant'].includes(event.type) || event.isMeta || event.isCompactSummary) return null;
  const timestamp = parseTimestamp(event.timestamp);
  if (!timestamp) return null;
  const base = recordMetadata(event, filePath, owner, index, timestamp);
  const blocks = contentBlocks(event.message);
  return event.type === "user" ? userRecord(base, blocks) : assistantRecord(base, event, blocks);
}

async function parseClaudeFile(filePath) {
  const owner = sessionOwner(filePath);
  const entries = [];
  let index = 0;
  for await (const event of jsonlEvents(filePath)) {
    const record = normalizedRecord(event, filePath, owner, index++);
    if (record) entries.push(record);
  }
  return {
    agent: "claude", path: filePath, id: owner.subagent ? entries[0]?.sessionId ?? owner.id : owner.id, entries,
    subagent: owner.subagent,
    cwd: entries.find((e) => e.cwd !== "(unknown)")?.cwd ?? "(unknown)",
    source: entries[0]?.source ?? "Claude Code",
    provider: entries.find((entry) => entry.provider !== "(unknown)")?.provider ?? "(unknown)", repositoryUrl: null,
    turnIds: new Set(), days: new Map(), insightsVersion: 1,
  };
}

function preferredOwner(current, candidate) {
  if (current.record.subagent !== candidate.record.subagent) return current.record.subagent ? candidate : current;
  // Copied history normally retains its originating session ID.
  const owns = (value) => value.parsed.id === value.record.sessionId;
  if (owns(current) !== owns(candidate)) return owns(candidate) ? candidate : current;
  return current.parsed.path.localeCompare(candidate.parsed.path) <= 0 ? current : candidate;
}


function usageSnapshot(current, candidate) {
  if (!current.tokens) return candidate;
  if (!candidate.tokens) return current;
  // Zero-output placeholders must not replace a completed request's usage.
  if ((current.tokens.output_tokens > 0) !== (candidate.tokens.output_tokens > 0)) {
    return candidate.tokens.output_tokens > 0 ? candidate : current;
  }
  return candidate.timestamp >= current.timestamp ? candidate : current;
}

function mergeRecord(existing, candidate) {
  const winner = preferredOwner(existing, candidate);
  const sameOwner = existing.parsed.path === candidate.parsed.path;
  const snapshot = sameOwner ? usageSnapshot(existing.record, candidate.record) : winner.record;
  const tools = new Map(existing.tools);
  for (const tool of candidate.tools.values()) {
    // Replayed copies must not move the original call into a later date window.
    const previousTool = tools.get(tool.id);
    if (!previousTool || (!sameOwner && winner === candidate) || tool.timestamp < previousTool.timestamp) tools.set(tool.id, tool);
  }
  return {
    ...winner,
    record: {
      ...winner.record, tokens: snapshot.tokens, modelTokens: snapshot.modelTokens, timestamp: snapshot.timestamp,
      // Split responses can carry their visible text in any fragment.
      text: existing.record.text || candidate.record.text,
    },
    tools,
  };
}

function canonicalRecords(parsedSessions) {
  const canonical = new Map();
  for (const parsed of parsedSessions) {
    for (const record of parsed.entries) {
      const candidate = { parsed, record, tools: new Map((record.tools ?? []).map((tool) => [tool.id, tool])) };
      const existing = canonical.get(record.key);
      canonical.set(record.key, existing ? mergeRecord(existing, candidate) : candidate);
    }
  }
  return canonical;
}

function inRange(timestamp, start, end) {
  return !(start && timestamp < start) && !(end && timestamp > end);
}

// Like Codex turn_context entries, a turn is a prompt that received a response; its first
// response supplies model and settings. Each transcript (and sidechain) has its own open
// prompt, tracked before date filtering. Subagent tasks count as their own turns.
function turnResponseKeys(parsedSessions) {
  const keys = new Set();
  for (const parsed of parsedSessions) {
    const open = new Set();
    for (const record of [...parsed.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
      if (record.type === "user") open.add(record.subagent);
      else if (open.delete(record.subagent)) keys.add(record.key);
    }
  }
  return keys;
}

function addMessage(parsed, record, startsTurn) {
  const daily = dailySessionFor(parsed.days, new Date(record.timestamp));
  // Like Codex agent messages, only responses with visible text are assistant messages.
  if (record.type === "user" || record.text) increment(daily.messages, record.type);
  for (const name of record.mentions ?? []) increment(daily.rawSkillEvidence.mentions, name);
  if (record.type !== "assistant") return;
  if (startsTurn) {
    increment(daily.models, record.model);
    if (record.effort) increment(daily.reasoningEfforts, label(record.effort));
    if (record.tier) increment(daily.serviceTiers, record.tier);
  }
  if (!record.tokens) return;
  addTokens(daily.tokens, record.tokens);
  for (const [model, tokens] of record.modelTokens) addModelTokens(daily.modelTokens, model, tokens);
  daily.tokenEvents += 1;
}

function addTools(parsed, tools, seenTools, range) {
  for (const tool of tools.values()) {
    const timestamp = new Date(tool.timestamp);
    if (seenTools.has(tool.id) || !inRange(timestamp, range.start, range.end)) continue;
    seenTools.add(tool.id);
    const daily = dailySessionFor(parsed.days, timestamp);
    increment(daily.tools, tool.name);
    for (const skillPath of tool.reads) increment(daily.rawSkillEvidence.reads, skillPath);
    for (const name of tool.mentions) increment(daily.rawSkillEvidence.mentions, name);
  }
}

function sessionFor(sessions, parsed, record, parents) {
  if (!sessions.has(parsed.id)) {
    const metadata = parents.get(parsed.id) ?? parsed;
    sessions.set(parsed.id, { ...metadata, entries: undefined, days: new Map() });
  }
  const session = sessions.get(parsed.id);
  if (session.cwd === "(unknown)") session.cwd = record.cwd;
  if (session.source === "Claude Code") session.source = record.source;
  if (record.provider !== "(unknown)") session.provider = record.provider;
  return session;
}

// Reconcile cached records across files before filtering. A cached daily sum cannot
// remove copied fork history or parent/subagent duplicates accurately.
export function reconcileClaudeSessions(parsedSessions, range) {
  const sessions = new Map();
  const seenTools = new Set();
  const parents = new Map(parsedSessions.filter((parsed) => !parsed.subagent).map((parsed) => [parsed.id, parsed]));
  const turns = turnResponseKeys(parsedSessions);
  const records = [...canonicalRecords(parsedSessions).values()].sort((a, b) => a.record.timestamp.localeCompare(b.record.timestamp));
  for (const { parsed, record, tools } of records) {
    const session = sessionFor(sessions, parsed, record, parents);
    if (inRange(new Date(record.timestamp), range.start, range.end)) addMessage(session, record, turns.has(record.key));
    addTools(session, tools, seenTools, range);
  }
  return [...sessions.values()];
}

function validCachedRecords(parsed) {
  if (!Array.isArray(parsed.entries)) return false;
  return parsed.entries.every((record) => record && ["user", "assistant"].includes(record.type)
    && typeof record.key === "string" && typeof record.timestamp === "string"
    && (record.type === "user" || Array.isArray(record.modelTokens)));
}

// Copied history keeps its originating session ID; subagent files belong to their parent.
function referencedSessions(parsed) {
  const ids = new Set(parsed.entries.map((record) => record.sessionId));
  if (!parsed.subagent) ids.delete(parsed.id);
  return [...ids];
}

export function claudeAdapter() {
  const home = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  return {
    id: "claude", name: "Claude Code", cacheVersion: 5, insightsVersion: 1,
    cachePath: path.join(home, "cache", "codex-report-claude-sessions-v5.json"),
    cachePattern: /^codex-report-claude-sessions-v\d+\.json$/,
    skillRoots: [path.join(home, "skills"), path.join(home, "plugins", "cache")],
    projectSkillRoots: [".claude/skills", ".agents/skills"],
    discover: () => sessionFiles(path.join(home, "projects")),
    cacheValid: validCachedRecords,
    parse: parseClaudeFile,
    reconcile: reconcileClaudeSessions,
    fileId: (file) => sessionOwner(file).subagent ? null : path.basename(file, ".jsonl"),
    references: referencedSessions,
  };
}
