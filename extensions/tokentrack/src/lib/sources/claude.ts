import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { DateRange, UsageEvent, UsageReaderSink } from "../types";
import { estimateCost } from "../pricing";
import { expandHome, isInRange, safeNumber } from "./shared";

type ClaudeFileTitles = {
  customTitle?: string;
  /** From `{"type":"ai-title","aiTitle":"…"}` — sidebar title in Claude Desktop. */
  aiTitle?: string;
  firstUserMessage?: string;
};

type ClaudeSessionIndexEntry = {
  customTitle?: string;
  firstPrompt?: string;
  summary?: string;
  fullPath?: string;
};

type ClaudeSessionIndex = Map<string, ClaudeSessionIndexEntry>;

/** Titles keyed by session UUID — survives stale paths in sessions-index. */
type ClaudeSessionTitles = Map<string, ClaudeFileTitles>;

type ClaudeRecord = {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  isSidechain?: boolean;
  customTitle?: string;
  aiTitle?: string;
  /** Top-level Anthropic request id (`req_…`); pairs with `message.id` to dedupe. */
  requestId?: string;
  message?: {
    role?: string;
    content?: string | { type?: string; text?: string }[];
    /** Anthropic assistant message id (`msg_…`); pairs with `requestId` to dedupe. */
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      /** Total cache creation tokens (5m + 1h). */
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      /**
       * Per-tier split of cache creation. Claude Code with extended thinking
       * writes almost everything into the 1h tier (~38% pricier than 5m), so
       * we bill them separately when this field is present.
       */
      cache_creation?: {
        ephemeral_1h_input_tokens?: number;
        ephemeral_5m_input_tokens?: number;
      };
    };
  };
};

/**
 * Cap on simultaneous JSONL streams. The full corpus can be 70+ MB across 200+
 * files; opening them all at once (Promise.all) keeps every readline buffer +
 * last-parsed-line object alive concurrently and pushes Raycast past its
 * 100 MB JS heap budget.
 */
const CLAUDE_READ_CONCURRENCY = 2;

/** Skip JSONL files not touched since before the window (sessions can span days). */
const CLAUDE_FILE_BACKDATE_MS = 7 * 24 * 60 * 60 * 1000;

const CLAUDE_SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Main session logs live at `projects/<cwd>/<uuid>.jsonl` — not `subagents/`. */
const CLAUDE_MAIN_SESSION_FILE_RE =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

export async function readClaudeUsage(
  basePath: string,
  range: DateRange,
  sink: UsageReaderSink,
): Promise<string[]> {
  const root = expandHome(basePath || "~/.claude");
  const projectRoot = join(root, "projects");
  const errors: string[] = [];
  // Cross-file dedup: Claude Code replicates assistant messages into the new
  // JSONL whenever a session is resumed or forked, so the same API response
  // appears in N project directories. Without this set the same usage row is
  // counted N times once the 500-event slice (see `usage.ts`) is removed.
  // Matches ccusage's `messageId:requestId` key.
  const seen = new Set<string>();

  if (!existsSync(projectRoot)) return errors;

  try {
    const files = await findJsonl(projectRoot, range);
    const sessionIndex = loadClaudeSessionsIndex(projectRoot);
    const sessionTitles = preloadClaudeSessionTitles(projectRoot, range);
    await runWithConcurrency(files, CLAUDE_READ_CONCURRENCY, (file) =>
      readClaudeFile(file, range, sink, seen, sessionTitles, sessionIndex),
    );
  } catch {
    errors.push("Claude: read error");
  }

  return errors;
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

export function readClaudeUsageSync(basePath: string, range: DateRange) {
  const root = expandHome(basePath || "~/.claude");
  const projectRoot = join(root, "projects");
  const errors: string[] = [];
  const events: UsageEvent[] = [];
  const seen = new Set<string>();

  if (!existsSync(projectRoot)) return { events, errors };

  const sessionIndex = loadClaudeSessionsIndex(projectRoot);
  const sessionTitles = preloadClaudeSessionTitles(projectRoot, range);
  const files = findJsonlSync(projectRoot, range);
  try {
    for (const file of files) {
      readClaudeFileSync(
        file,
        range,
        events,
        seen,
        sessionTitles,
        sessionIndex,
      );
    }
  } catch {
    errors.push("Claude: read error");
  }

  return { events, errors };
}

async function readClaudeFile(
  file: string,
  range: DateRange,
  sink: UsageReaderSink,
  seen: Set<string>,
  sessionTitles: ClaudeSessionTitles,
  sessionIndex: ClaudeSessionIndex,
) {
  const reader = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of reader) {
    lineNumber += 1;
    pushClaudeLine(
      file,
      line,
      lineNumber,
      range,
      sink,
      seen,
      sessionTitles,
      sessionIndex,
    );
  }
}

function readClaudeFileSync(
  file: string,
  range: DateRange,
  events: UsageEvent[],
  seen: Set<string>,
  sessionTitles: ClaudeSessionTitles,
  sessionIndex: ClaudeSessionIndex,
) {
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      pushClaudeLine(
        file,
        line,
        index + 1,
        range,
        { event: (e) => events.push(e) },
        seen,
        sessionTitles,
        sessionIndex,
      );
    });
}

const TIMESTAMP_RE = /"timestamp"\s*:\s*"([^"]+)"/;

const CLAUDE_TITLE_MAX = 80;

function isMainClaudeSessionFile(file: string): boolean {
  return CLAUDE_MAIN_SESSION_FILE_RE.test(file);
}

function sessionIdFromMainSessionFile(file: string): string | undefined {
  if (!isMainClaudeSessionFile(file)) return undefined;
  const base = file.split("/").pop() ?? "";
  const id = base.replace(/\.jsonl$/i, "");
  return CLAUDE_SESSION_ID_RE.test(id) ? id : undefined;
}

function mainSessionPathForFile(
  file: string,
  sessionId: string,
  sessionIndex: ClaudeSessionIndex,
): string {
  const indexed = sessionIndex.get(sessionId)?.fullPath;
  if (indexed) return indexed;

  if (isMainClaudeSessionFile(file)) return file;

  const marker = `/${sessionId}/`;
  const subagentIdx = file.indexOf(marker);
  if (subagentIdx >= 0) {
    return `${file.slice(0, subagentIdx)}/${sessionId}.jsonl`;
  }

  const dir = file.split("/").slice(0, -1).join("/");
  const candidate = join(dir, `${sessionId}.jsonl`);
  return existsSync(candidate) ? candidate : file;
}

/**
 * Claude Desktop sidebar: `/rename` custom title, then `ai-title` lines in the
 * session JSONL, then `sessions-index.json` when present.
 */
function loadClaudeSessionsIndex(projectRoot: string): ClaudeSessionIndex {
  const index: ClaudeSessionIndex = new Map();
  if (!existsSync(projectRoot)) return index;

  for (const entry of readdirSync(projectRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const indexPath = join(projectRoot, entry.name, "sessions-index.json");
    if (!existsSync(indexPath)) continue;

    try {
      const raw = JSON.parse(readFileSync(indexPath, "utf8")) as {
        entries?: Array<{
          sessionId?: string;
          customTitle?: string;
          firstPrompt?: string;
          summary?: string;
          fullPath?: string;
          isSidechain?: boolean;
        }>;
      };
      for (const row of raw.entries ?? []) {
        if (typeof row.sessionId !== "string" || row.isSidechain) continue;
        const customTitle =
          typeof row.customTitle === "string" && row.customTitle.trim()
            ? truncateClaudeTitle(row.customTitle)
            : undefined;
        const firstPrompt =
          typeof row.firstPrompt === "string" && row.firstPrompt.trim()
            ? truncateClaudeTitle(row.firstPrompt)
            : undefined;
        const summary =
          typeof row.summary === "string" && row.summary.trim()
            ? truncateClaudeTitle(row.summary)
            : undefined;
        const fullPath =
          typeof row.fullPath === "string" ? row.fullPath : undefined;
        const existing = index.get(row.sessionId);
        index.set(row.sessionId, {
          customTitle: customTitle ?? existing?.customTitle,
          firstPrompt: firstPrompt ?? existing?.firstPrompt,
          summary: summary ?? existing?.summary,
          fullPath: fullPath ?? existing?.fullPath,
        });
      }
    } catch {
      // index is optional and may be stale
    }
  }

  return index;
}

/** Main sessions only: `projects/<cwd>/<uuid>.jsonl` (never `subagents/`). */
function findMainSessionJsonl(projectRoot: string, range: DateRange): string[] {
  if (!existsSync(projectRoot)) return [];
  const cutoffMs = range.start.getTime() - CLAUDE_FILE_BACKDATE_MS;

  return readdirSync(projectRoot, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const dir = join(projectRoot, entry.name);
    try {
      return readdirSync(dir, { withFileTypes: true }).flatMap((file) => {
        if (!file.isFile() || !file.name.endsWith(".jsonl")) return [];
        const sessionId = file.name.replace(/\.jsonl$/i, "");
        if (!CLAUDE_SESSION_ID_RE.test(sessionId)) return [];
        const path = join(dir, file.name);
        try {
          if (statSync(path).mtimeMs < cutoffMs) return [];
        } catch {
          return [];
        }
        return [path];
      });
    } catch {
      return [];
    }
  });
}

function preloadClaudeSessionTitles(
  projectRoot: string,
  range: DateRange,
): ClaudeSessionTitles {
  const titles: ClaudeSessionTitles = new Map();

  for (const file of findMainSessionJsonl(projectRoot, range)) {
    const sessionId = sessionIdFromMainSessionFile(file);
    if (!sessionId) continue;

    let state = titles.get(sessionId);
    if (!state) {
      state = {};
      titles.set(sessionId, state);
    }

    try {
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        noteClaudeSessionLine(line, state);
      }
    } catch {
      // optional metadata
    }
  }

  return titles;
}

function noteClaudeSessionLine(line: string, state: ClaudeFileTitles) {
  if (line.length > 4_000) return;
  if (
    !line.includes('"custom-title"') &&
    !line.includes('"ai-title"') &&
    !line.includes('"type":"user"')
  )
    return;

  const record = parseLine(line);
  if (!record) return;

  if (record.type === "custom-title" && record.customTitle) {
    const title = truncateClaudeTitle(record.customTitle);
    if (title) state.customTitle = title;
    return;
  }

  if (record.type === "ai-title" && record.aiTitle) {
    const title = truncateClaudeTitle(record.aiTitle);
    if (title) state.aiTitle = title;
    return;
  }

  if (record.isSidechain || record.type !== "user") return;

  if (!state.firstUserMessage) {
    const text = firstClaudeUserText(record);
    if (text) state.firstUserMessage = truncateClaudeTitle(text);
  }
}

function resolveClaudeSessionTitle(
  sessionId: string,
  sessionTitles: ClaudeSessionTitles,
  sessionIndex: ClaudeSessionIndex,
): string | undefined {
  const indexed = sessionIndex.get(sessionId);
  const fileState = sessionTitles.get(sessionId);
  return (
    indexed?.customTitle ??
    fileState?.customTitle ??
    fileState?.aiTitle ??
    indexed?.summary ??
    indexed?.firstPrompt ??
    fileState?.firstUserMessage
  );
}

function firstClaudeUserText(record: ClaudeRecord): string | undefined {
  const content = record.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (!Array.isArray(content)) return undefined;
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    if (part.type === "tool_result") continue;
    if (
      part.type === "text" &&
      typeof part.text === "string" &&
      part.text.trim()
    ) {
      return part.text.trim();
    }
  }
  return undefined;
}

function truncateClaudeTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= CLAUDE_TITLE_MAX
    ? t
    : `${t.slice(0, CLAUDE_TITLE_MAX - 1)}…`;
}

function pushClaudeLine(
  file: string,
  line: string,
  lineNumber: number,
  range: DateRange,
  sink: UsageReaderSink,
  seen: Set<string>,
  sessionTitles: ClaudeSessionTitles,
  sessionIndex: ClaudeSessionIndex,
) {
  if (!line.includes('"usage"')) return;

  // Cheap timestamp pre-filter: skip JSON.parse for assistant lines outside the
  // requested range. With months of history this avoids parsing the bulk of the
  // corpus and keeps peak JS heap well under Raycast's 100 MB extension cap.
  const tsMatch = TIMESTAMP_RE.exec(line);
  if (!tsMatch) return;
  if (!isInRange(new Date(tsMatch[1]), range.start, range.end)) return;

  const record = parseLine(line);
  if (
    !record?.timestamp ||
    record.type !== "assistant" ||
    !record.message?.usage
  )
    return;
  const timestamp = new Date(record.timestamp);
  if (!isInRange(timestamp, range.start, range.end)) return;

  // Drop replicated assistant messages: Claude Code copies the running
  // transcript into a fresh JSONL whenever a session is resumed or forked, so
  // the same Anthropic response can appear in N projects' files. We use the
  // same `messageId:requestId` key as ccusage / token-budg. If either id is
  // missing (older Claude Code versions) we fall back to file:line uniqueness.
  const messageId = record.message.id;
  const requestId = record.requestId;
  const dedupKey =
    messageId && requestId ? `${messageId}:${requestId}` : undefined;
  if (dedupKey) {
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
  }

  const usage = record.message.usage;
  const inputTokens = safeNumber(usage.input_tokens);
  const outputTokens = safeNumber(usage.output_tokens);
  const cacheReadTokens = safeNumber(usage.cache_read_input_tokens);
  const cacheWriteTokens = safeNumber(usage.cache_creation_input_tokens);
  // 1h ephemeral cache write subset. When the top-level
  // `cache_creation_input_tokens` is present but the breakdown is missing
  // (older Claude Code lines), we assume 5m — the cheaper, more common tier.
  const cacheWrite1hTokens = Math.min(
    cacheWriteTokens,
    safeNumber(usage.cache_creation?.ephemeral_1h_input_tokens),
  );
  const totalTokens =
    inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
  if (totalTokens <= 0) return;

  const estimatedCost = estimateCost({
    model: record.message.model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    cacheWrite1hTokens,
  });

  sink.metric?.({
    timestamp,
    totalTokens,
    estimatedCost,
    estimatedTokens: false,
  });

  const sessionId =
    (typeof record.sessionId === "string" &&
      CLAUDE_SESSION_ID_RE.test(record.sessionId) &&
      record.sessionId) ||
    sessionIdFromMainSessionFile(file);
  if (!sessionId) return;

  const mainSessionPath = mainSessionPathForFile(file, sessionId, sessionIndex);

  sink.event?.({
    id: dedupKey ? `claude:${dedupKey}` : `claude:${file}:${lineNumber}`,
    provider: "claude",
    timestamp,
    model: record.message.model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    estimatedCost,
    estimatedTokens: false,
    sourcePath: mainSessionPath,
    conversationKey: `claude:${sessionId}`,
    conversationTitle: resolveClaudeSessionTitle(
      sessionId,
      sessionTitles,
      sessionIndex,
    ),
  });
}

async function findJsonl(root: string, range: DateRange): Promise<string[]> {
  const cutoffMs = range.start.getTime() - CLAUDE_FILE_BACKDATE_MS;
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return findJsonl(path, range);
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) return [];
      try {
        const { mtimeMs } = await stat(path);
        if (mtimeMs < cutoffMs) return [];
      } catch {
        return [];
      }
      return [path];
    }),
  );
  return files.flat();
}

function findJsonlSync(root: string, range: DateRange): string[] {
  const cutoffMs = range.start.getTime() - CLAUDE_FILE_BACKDATE_MS;
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return findJsonlSync(path, range);
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) return [];
    try {
      const { mtimeMs } = statSync(path);
      if (mtimeMs < cutoffMs) return [];
    } catch {
      return [];
    }
    return [path];
  });
}

function parseLine(line: string): ClaudeRecord | undefined {
  try {
    return JSON.parse(line) as ClaudeRecord;
  } catch {
    return undefined;
  }
}
