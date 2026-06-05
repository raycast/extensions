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
import type { DateRange, UsageEvent } from "../types";
import { estimateCost } from "../pricing";
import { expandHome, isInRange, safeNumber } from "./shared";

type ClaudeRecord = {
  type?: string;
  timestamp?: string;
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
const CLAUDE_READ_CONCURRENCY = 4;

/** Skip JSONL files not touched since before the window (sessions can span days). */
const CLAUDE_FILE_BACKDATE_MS = 7 * 24 * 60 * 60 * 1000;

export async function readClaudeUsage(basePath: string, range: DateRange) {
  const root = expandHome(basePath || "~/.claude");
  const projectRoot = join(root, "projects");
  const errors: string[] = [];
  const events: UsageEvent[] = [];
  // Cross-file dedup: Claude Code replicates assistant messages into the new
  // JSONL whenever a session is resumed or forked, so the same API response
  // appears in N project directories. Without this set the same usage row is
  // counted N times once the 500-event slice (see `usage.ts`) is removed.
  // Matches ccusage's `messageId:requestId` key.
  const seen = new Set<string>();

  if (!existsSync(projectRoot)) return { events, errors };

  try {
    const files = await findJsonl(projectRoot, range);
    const fileTitles = new Map<string, string>();
    await runWithConcurrency(files, CLAUDE_READ_CONCURRENCY, (file) =>
      readClaudeFile(file, range, events, seen, fileTitles),
    );
  } catch {
    errors.push("Claude: read error");
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

export function readClaudeUsageSync(basePath: string, range: DateRange) {
  const root = expandHome(basePath || "~/.claude");
  const projectRoot = join(root, "projects");
  const errors: string[] = [];
  const events: UsageEvent[] = [];
  const seen = new Set<string>();

  if (!existsSync(projectRoot)) return { events, errors };

  const fileTitles = new Map<string, string>();
  try {
    for (const file of findJsonlSync(projectRoot, range)) {
      readClaudeFileSync(file, range, events, seen, fileTitles);
    }
  } catch {
    errors.push("Claude: read error");
  }

  return { events, errors };
}

async function readClaudeFile(
  file: string,
  range: DateRange,
  events: UsageEvent[],
  seen: Set<string>,
  fileTitles: Map<string, string>,
) {
  const reader = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of reader) {
    lineNumber += 1;
    tryNoteClaudeSessionTitle(file, line, fileTitles);
    pushClaudeLine(file, line, lineNumber, range, events, seen, fileTitles);
  }
}

function readClaudeFileSync(
  file: string,
  range: DateRange,
  events: UsageEvent[],
  seen: Set<string>,
  fileTitles: Map<string, string>,
) {
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      tryNoteClaudeSessionTitle(file, line, fileTitles);
      pushClaudeLine(file, line, index + 1, range, events, seen, fileTitles);
    });
}

const TIMESTAMP_RE = /"timestamp"\s*:\s*"([^"]+)"/;

const CLAUDE_TITLE_MAX = 80;

const CLAUDE_AI_TITLE_RE = /"aiTitle"\s*:\s*"((?:\\.|[^"\\])*)"/;

/** Regex-only — avoid JSON.parse on every transcript line. */
function tryNoteClaudeSessionTitle(
  file: string,
  line: string,
  fileTitles: Map<string, string>,
) {
  if (fileTitles.has(file)) return;
  if (!line.includes('"ai-title"') || line.length > 4_000) return;

  const match = CLAUDE_AI_TITLE_RE.exec(line);
  if (!match) return;

  try {
    const title = truncateClaudeTitle(JSON.parse(`"${match[1]}"`) as string);
    if (title) fileTitles.set(file, title);
  } catch {
    const title = truncateClaudeTitle(
      match[1].replace(/\\n/g, " ").replace(/\\"/g, '"'),
    );
    if (title) fileTitles.set(file, title);
  }
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
  events: UsageEvent[],
  seen: Set<string>,
  fileTitles: Map<string, string>,
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

  events.push({
    id: dedupKey ? `claude:${dedupKey}` : `claude:${file}:${lineNumber}`,
    provider: "claude",
    timestamp,
    model: record.message.model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    estimatedCost: estimateCost({
      model: record.message.model,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      cacheWrite1hTokens,
    }),
    estimatedTokens: false,
    sourcePath: file,
    conversationKey: file,
    conversationTitle: fileTitles.get(file),
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
