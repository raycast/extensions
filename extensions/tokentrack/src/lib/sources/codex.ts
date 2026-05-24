import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { DateRange, UsageEvent } from "../types";
import { estimateCost } from "../pricing";
import { expandHome, isInRange, safeNumber } from "./shared";

/**
 * Codex rollout JSONL schema (subset).
 * @see ~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl
 *
 * `last_token_usage` is the per-turn delta we bill on, `total_token_usage` is
 * the cumulative tally; we fall back to `total - previousTotals` whenever
 * `last_token_usage` is missing (mirrors ccusage / token-budg behavior).
 */
type CodexTokenUsage = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
};

type CodexRecord = {
  timestamp?: string;
  type?: string;
  payload?: {
    type?: string;
    role?: string;
    model?: string;
    cwd?: string;
    content?: { type?: string; text?: string }[];
    git?: { branch?: string };
    info?: {
      total_token_usage?: CodexTokenUsage;
      last_token_usage?: CodexTokenUsage;
      model_context_window?: number;
    };
  };
};

const CODEX_READ_CONCURRENCY = 4;

/**
 * Date buffer when filtering YYYY/MM/DD folders: a session whose file lives in
 * yesterday's folder can still emit `token_count` events that land inside the
 * requested range a few hours later. 36h keeps long Codex sessions in scope
 * without forcing a full scan of older months.
 */
const CODEX_FOLDER_BACKDATE_MS = 36 * 60 * 60 * 1000;

export async function readCodexUsage(basePath: string, range: DateRange) {
  const root = expandHome(basePath || "~/.codex");
  const sessionsRoot = join(root, "sessions");
  const errors: string[] = [];
  const events: UsageEvent[] = [];

  if (!existsSync(sessionsRoot)) return { events, errors };

  const sessionIndex = loadCodexSessionIndex(root);

  try {
    const files = await findRolloutsAsync(sessionsRoot, range);
    await runWithConcurrency(files, CODEX_READ_CONCURRENCY, (file) =>
      readCodexFile(file, range, events, sessionIndex),
    );
  } catch {
    errors.push("Codex: read error");
  }

  return { events, errors };
}

export function readCodexUsageSync(basePath: string, range: DateRange) {
  const root = expandHome(basePath || "~/.codex");
  const sessionsRoot = join(root, "sessions");
  const errors: string[] = [];
  const events: UsageEvent[] = [];

  if (!existsSync(sessionsRoot)) return { events, errors };

  const sessionIndex = loadCodexSessionIndex(root);

  try {
    for (const file of findRolloutsSync(sessionsRoot, range)) {
      readCodexFileSync(file, range, events, sessionIndex);
    }
  } catch {
    errors.push("Codex: read error");
  }

  return { events, errors };
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index]);
      }
    },
  );
  await Promise.all(runners);
}

/**
 * Per-file state machine for the Codex JSONL parser.
 *
 * - `currentModel` tracks the most recent `turn_context.model` so token_count
 *   rows (which have no model field of their own) can be priced correctly.
 *   See ADR-0007 in the token-budg reference repo: without this, Codex events
 *   ingest with an empty model string and silently fall back to $0 / $5 per
 *   call which is exactly the bug we just hit on the dashboard.
 * - `previousTotals` tracks the most recent `total_token_usage` so we can
 *   derive a per-turn delta whenever `last_token_usage` is absent.
 */
type FileState = {
  currentModel: string | undefined;
  previousTotals: CodexTokenUsage;
  sessionTitle?: string;
};

const CODEX_TITLE_MAX = 80;

/** rollout-…-<uuid>.jsonl — session id is the trailing UUID segment. */
const CODEX_ROLLOUT_ID_RE =
  /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;

type CodexSessionIndex = Map<string, string>;

function newFileState(): FileState {
  return { currentModel: undefined, previousTotals: {} };
}

function truncateCodexTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= CODEX_TITLE_MAX
    ? t
    : `${t.slice(0, CODEX_TITLE_MAX - 1)}…`;
}

/**
 * Codex Desktop stores human-readable thread names in
 * `$CODEX_HOME/session_index.jsonl` (`thread_name` keyed by session `id`).
 */
function loadCodexSessionIndex(root: string): CodexSessionIndex {
  const indexPath = join(root, "session_index.jsonl");
  const index: CodexSessionIndex = new Map();
  if (!existsSync(indexPath)) return index;

  try {
    for (const line of readFileSync(indexPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as {
          id?: string;
          thread_name?: string;
        };
        if (typeof row.id === "string" && typeof row.thread_name === "string") {
          const title = truncateCodexTitle(row.thread_name);
          if (title) index.set(row.id, title);
        }
      } catch {
        // skip malformed index rows
      }
    }
  } catch {
    // index is optional
  }

  return index;
}

function sessionIdFromRolloutPath(file: string): string | undefined {
  return CODEX_ROLLOUT_ID_RE.exec(file)?.[1];
}

function resolveCodexSessionTitle(
  file: string,
  sessionIndex: CodexSessionIndex,
  state: FileState,
) {
  if (state.sessionTitle) return;

  const sessionId = sessionIdFromRolloutPath(file);
  if (!sessionId) return;

  const threadName = sessionIndex.get(sessionId);
  if (threadName) state.sessionTitle = threadName;
}

/** Fallback when session_index has no entry — never JSON.parse session_meta. */
function noteCodexSessionTitleFallbackFromLine(line: string, state: FileState) {
  if (state.sessionTitle) return;

  const branch = /"branch"\s*:\s*"([^"]+)"/.exec(line)?.[1];
  const cwd = /"cwd"\s*:\s*"([^"]+)"/.exec(line)?.[1];
  const cwdBase = cwd ? cwd.split("/").filter(Boolean).pop() : undefined;

  if (branch && cwdBase) {
    state.sessionTitle = truncateCodexTitle(`${cwdBase} (${branch})`);
  } else if (branch) {
    state.sessionTitle = truncateCodexTitle(branch);
  } else if (cwdBase) {
    state.sessionTitle = truncateCodexTitle(cwdBase);
  }
}

async function readCodexFile(
  file: string,
  range: DateRange,
  events: UsageEvent[],
  sessionIndex: CodexSessionIndex,
) {
  const reader = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  const state = newFileState();
  resolveCodexSessionTitle(file, sessionIndex, state);
  let offset = 0;
  for await (const line of reader) {
    pushCodexLine(file, line, offset, range, events, state, sessionIndex);
    offset += 1;
  }
}

function readCodexFileSync(
  file: string,
  range: DateRange,
  events: UsageEvent[],
  sessionIndex: CodexSessionIndex,
) {
  const state = newFileState();
  resolveCodexSessionTitle(file, sessionIndex, state);
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) =>
      pushCodexLine(file, line, index, range, events, state, sessionIndex),
    );
}

const TIMESTAMP_RE = /"timestamp"\s*:\s*"([^"]+)"/;

function pushCodexLine(
  file: string,
  line: string,
  offset: number,
  range: DateRange,
  events: UsageEvent[],
  state: FileState,
  sessionIndex: CodexSessionIndex,
) {
  if (line.includes('"session_meta"') && !state.sessionTitle) {
    const sessionId = /"id"\s*:\s*"([^"]+)"/.exec(line)?.[1];
    if (sessionId) {
      const threadName = sessionIndex.get(sessionId);
      if (threadName) state.sessionTitle = threadName;
    }
    if (!state.sessionTitle) {
      noteCodexSessionTitleFallbackFromLine(line, state);
    }
  }

  // Never JSON.parse huge transcript lines — only turn_context + token_count.
  if (!line.includes('"token_count"') && !line.includes('"turn_context"'))
    return;

  const tsMatch = TIMESTAMP_RE.exec(line);
  if (!tsMatch) return;
  const timestamp = new Date(tsMatch[1]);

  const record = parseLine(line);
  if (!record) return;

  const payload = record.payload;
  if (!payload) return;

  // Track model name from turn_context so subsequent token_count events have
  // something to price against.
  if (typeof payload.model === "string" && payload.model) {
    state.currentModel = payload.model;
  }

  if (payload.type !== "token_count") return;

  const info = payload.info;
  const totalUsage = info?.total_token_usage;
  const last = info?.last_token_usage;

  // Compute the per-turn delta: prefer `last_token_usage`, otherwise diff the
  // cumulative `total_token_usage` against the running `previousTotals`.
  // Clamp at zero (matches ccusage's `subtractRawUsage` clamping).
  let delta: CodexTokenUsage | undefined;
  if (last) {
    delta = normalize(last);
  } else if (totalUsage) {
    delta = subtractClamped(normalize(totalUsage), state.previousTotals);
  }

  // Always update previousTotals so out-of-range events still teach us the
  // running cumulative — otherwise the first in-range event for the session
  // would attribute everything since 0 to one turn.
  if (totalUsage) state.previousTotals = normalize(totalUsage);

  if (!delta || isAllZero(delta)) return;
  // Only emit events that land inside the requested period.
  if (!isInRange(timestamp, range.start, range.end)) return;

  const inputTokens = safeNumber(delta.input_tokens);
  const cachedInputTokens = safeNumber(delta.cached_input_tokens);
  const outputTokens = safeNumber(delta.output_tokens);
  const reasoningTokens = safeNumber(delta.reasoning_output_tokens);

  // Codex (like OpenAI's API) bills cached tokens as a SUBSET of the input
  // count: `input_tokens` already includes `cached_input_tokens`. Subtract so
  // the non-cached portion is priced at the full input rate and the cached
  // portion at the (much cheaper) cached rate. Mirrors ccusage's
  // `calculateCostUSD` and token-budg's `codexCostBreakdown`. Without this we
  // priced 100% of input at full rate, which produced the ~5× overcount on
  // the dashboard.
  const effectiveInput = Math.max(0, inputTokens - cachedInputTokens);
  const billedOutput = outputTokens + reasoningTokens;
  // Display total = full input + output + reasoning (cached is already part
  // of input). Matches the totals shown in `codex usage` / TokenBudg CLI.
  const totalTokens = inputTokens + outputTokens + reasoningTokens;
  if (totalTokens <= 0) return;

  events.push({
    id: `codex:${file}:${offset}`,
    provider: "codex",
    timestamp,
    model: state.currentModel,
    inputTokens: effectiveInput,
    outputTokens: billedOutput,
    cacheReadTokens: cachedInputTokens,
    cacheWriteTokens: 0,
    totalTokens,
    estimatedCost: estimateCost({
      model: state.currentModel,
      inputTokens: effectiveInput,
      outputTokens: billedOutput,
      cacheReadTokens: cachedInputTokens,
      cacheWriteTokens: 0,
    }),
    estimatedTokens: false,
    sourcePath: file,
    conversationKey: file,
    conversationTitle: state.sessionTitle,
  });
}

function normalize(u: CodexTokenUsage): CodexTokenUsage {
  return {
    input_tokens: safeNumber(u.input_tokens),
    cached_input_tokens: safeNumber(u.cached_input_tokens),
    output_tokens: safeNumber(u.output_tokens),
    reasoning_output_tokens: safeNumber(u.reasoning_output_tokens),
    total_tokens: safeNumber(u.total_tokens),
  };
}

function subtractClamped(
  a: CodexTokenUsage,
  b: CodexTokenUsage,
): CodexTokenUsage {
  return {
    input_tokens: Math.max(
      0,
      safeNumber(a.input_tokens) - safeNumber(b.input_tokens),
    ),
    cached_input_tokens: Math.max(
      0,
      safeNumber(a.cached_input_tokens) - safeNumber(b.cached_input_tokens),
    ),
    output_tokens: Math.max(
      0,
      safeNumber(a.output_tokens) - safeNumber(b.output_tokens),
    ),
    reasoning_output_tokens: Math.max(
      0,
      safeNumber(a.reasoning_output_tokens) -
        safeNumber(b.reasoning_output_tokens),
    ),
  };
}

function isAllZero(u: CodexTokenUsage): boolean {
  return (
    safeNumber(u.input_tokens) === 0 &&
    safeNumber(u.output_tokens) === 0 &&
    safeNumber(u.cached_input_tokens) === 0 &&
    safeNumber(u.reasoning_output_tokens) === 0
  );
}

/**
 * Walks `<sessionsRoot>/<YYYY>/<MM>/<DD>/rollout-*.jsonl` and returns only the
 * day-folders whose date is within `[range.start - backdate, range.end]`.
 *
 * Why filter at the folder level: with 300+ session files across many months
 * (~280 MB for a power user) we'd otherwise stream-parse the entire archive
 * every refresh. The `backdate` slack covers sessions that started just
 * before the period boundary and continue into it.
 */
async function findRolloutsAsync(
  root: string,
  range: DateRange,
): Promise<string[]> {
  const start = new Date(range.start.getTime() - CODEX_FOLDER_BACKDATE_MS);
  const end = range.end;
  const results: string[] = [];
  await collectRolloutDirsAsync(root, start, end, results);
  return results;
}

function findRolloutsSync(root: string, range: DateRange): string[] {
  const start = new Date(range.start.getTime() - CODEX_FOLDER_BACKDATE_MS);
  const end = range.end;
  const results: string[] = [];
  collectRolloutDirsSync(root, start, end, results);
  return results;
}

async function collectRolloutDirsAsync(
  root: string,
  start: Date,
  end: Date,
  out: string[],
): Promise<void> {
  for (const year of await safeReaddir(root)) {
    if (!isFourDigit(year)) continue;
    const yearPath = join(root, year);
    for (const month of await safeReaddir(yearPath)) {
      if (!isTwoDigit(month)) continue;
      const monthPath = join(yearPath, month);
      if (!monthOverlaps(year, month, start, end)) continue;
      for (const day of await safeReaddir(monthPath)) {
        if (!isTwoDigit(day)) continue;
        if (!dayOverlaps(year, month, day, start, end)) continue;
        const dayPath = join(monthPath, day);
        for (const name of await safeReaddir(dayPath)) {
          if (name.endsWith(".jsonl")) out.push(join(dayPath, name));
        }
      }
    }
  }
}

function collectRolloutDirsSync(
  root: string,
  start: Date,
  end: Date,
  out: string[],
): void {
  for (const year of safeReaddirSync(root)) {
    if (!isFourDigit(year)) continue;
    const yearPath = join(root, year);
    for (const month of safeReaddirSync(yearPath)) {
      if (!isTwoDigit(month)) continue;
      const monthPath = join(yearPath, month);
      if (!monthOverlaps(year, month, start, end)) continue;
      for (const day of safeReaddirSync(monthPath)) {
        if (!isTwoDigit(day)) continue;
        if (!dayOverlaps(year, month, day, start, end)) continue;
        const dayPath = join(monthPath, day);
        for (const name of safeReaddirSync(dayPath)) {
          if (name.endsWith(".jsonl")) out.push(join(dayPath, name));
        }
      }
    }
  }
}

async function safeReaddir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

function safeReaddirSync(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function isFourDigit(s: string): boolean {
  return /^\d{4}$/.test(s);
}

function isTwoDigit(s: string): boolean {
  return /^\d{2}$/.test(s);
}

function monthOverlaps(
  year: string,
  month: string,
  start: Date,
  end: Date,
): boolean {
  const y = Number(year);
  const m = Number(month);
  // First moment of month: YYYY-MM-01 00:00 local. Last moment: YYYY-(MM+1)-01.
  const monthStart = new Date(y, m - 1, 1).getTime();
  const monthEnd = new Date(y, m, 1).getTime();
  return monthEnd > start.getTime() && monthStart <= end.getTime();
}

function dayOverlaps(
  year: string,
  month: string,
  day: string,
  start: Date,
  end: Date,
): boolean {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const dayStart = new Date(y, m - 1, d).getTime();
  const dayEnd = new Date(y, m - 1, d + 1).getTime();
  return dayEnd > start.getTime() && dayStart <= end.getTime();
}

function parseLine(line: string): CodexRecord | undefined {
  try {
    return JSON.parse(line) as CodexRecord;
  } catch {
    return undefined;
  }
}
