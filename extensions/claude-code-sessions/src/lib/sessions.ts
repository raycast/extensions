import { createReadStream, promises as fs, existsSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

/**
 * Minimal key-value cache contract used to memoize per-file parse results
 * keyed by `path:mtime`. Deliberately framework-agnostic (no dependency on
 * `@raycast/api`, which only resolves inside the Raycast app runtime) so
 * this module can also be exercised by a standalone Node script.
 */
export interface KeyValueCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

/** Simple in-memory cache — useful for tests/scripts, not persisted across process restarts. */
export class InMemoryCache implements KeyValueCache {
  private store = new Map<string, string>();
  get(key: string): string | undefined {
    return this.store.get(key);
  }
  set(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Wrapper tag names Claude Code (and Conductor) prepend to a user turn that
 * aren't themselves a human-typed prompt. Critically, these can be a
 * *prefix* of the same message rather than a separate line — e.g. every
 * Conductor session's first user message is literally
 * `<system_instruction>...boilerplate...</system_instruction>\n\n<the real
 * human prompt>` in one string. `stripLeadingWrapperBlocks` below strips any
 * of these (possibly several in a row) off the front and keeps whatever real
 * text remains, instead of discarding the whole message.
 */
const WRAPPER_TAG_NAMES = [
  "ide_selection",
  "system_instruction",
  "system-reminder",
  "command-message",
  "command-name",
  "local-command-stdout",
];
const LEADING_WRAPPER_RE = new RegExp(
  `^\\s*<(${WRAPPER_TAG_NAMES.join("|")})>[\\s\\S]*?<\\/\\1>\\s*`,
);

const HEAD_MAX_LINES = 60;
const HEAD_MAX_BYTES = 96 * 1024;
const TAIL_MAX_BYTES = 128 * 1024;
const PREVIEW_MESSAGE_COUNT = 3;

export type EntrypointKind = "claude-desktop" | "conductor" | "cli";

export interface SessionMeta {
  sessionId: string;
  filePath: string;
  projectDirName: string;
  cwd: string;
  gitBranch?: string;
  slug?: string;
  entrypoint?: string;
  version?: string;
  createdAt: Date;
  mtime: Date;
  size: number;
  /** First real human-authored prompt text, truncated to ~80 chars. Always available. */
  firstPromptTitle: string;
  /** First real human-authored prompt text, capped at ~2000 chars, for the detail markdown. */
  firstPromptFull: string;
  /** `custom-title` / `ai-title` records found while scanning the file, if any. */
  customTitle?: string;
  aiTitle?: string;
  messageCount: number;
}

export interface SessionPreviewMessage {
  role: "user" | "assistant";
  text: string;
}

interface JsonlRecord {
  type?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  slug?: string;
  entrypoint?: string;
  version?: string;
  timestamp?: string;
  isSidechain?: boolean;
  customTitle?: string;
  aiTitle?: string;
  message?: { role?: string; content?: unknown };
}

function safeParseLine(line: string): JsonlRecord | undefined {
  if (!line) return undefined;
  try {
    return JSON.parse(line) as JsonlRecord;
  } catch {
    return undefined;
  }
}

/** Extracts the first plain-text block from a user/assistant message's content. */
function extractText(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        (block as { type?: string }).type === "text"
      ) {
        const text = (block as { text?: string }).text;
        if (typeof text === "string") return text;
      }
    }
  }
  return undefined;
}

/**
 * Strips any leading `<wrapper>...</wrapper>` block(s) (see
 * `WRAPPER_TAG_NAMES`) off `text`, then returns the real, human-typed prompt
 * that remains — or `undefined` if nothing real is left (the whole message
 * was wrapper content, or what remains is just a `/slash-command`).
 */
function extractRealPromptText(text: string): string | undefined {
  let remaining = text;
  while (LEADING_WRAPPER_RE.test(remaining)) {
    remaining = remaining.replace(LEADING_WRAPPER_RE, "");
  }
  const trimmed = remaining.trim();
  if (!trimmed || trimmed.startsWith("/")) return undefined;
  return trimmed;
}

function truncateTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 80) return collapsed;
  return `${collapsed.slice(0, 79).trimEnd()}…`;
}

function capText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Reads only the first `maxBytes` of a file as raw bytes (a single bounded
 * read, not a stream) and splits whatever's there into lines. Deliberately
 * NOT readline-based: readline must buffer an entire line before it can emit
 * it, so if line 1 of a file happened to be huge, a readline-based head
 * reader could still balloon far past `maxBytes` before we ever get a chance
 * to stop it. Reading a fixed byte budget up front has no such failure mode
 * — memory use for this function is exactly `maxBytes`, always.
 */
async function readHeadLines(
  filePath: string,
  maxLines = HEAD_MAX_LINES,
  maxBytes = HEAD_MAX_BYTES,
): Promise<string[]> {
  const fh = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await fh.read(buffer, 0, maxBytes, 0);
    const text = buffer.toString("utf8", 0, bytesRead);
    // The last line is likely a truncated partial line (we stopped at a byte
    // budget, not a line boundary) — drop it unless we read the whole file.
    const readWholeFile = bytesRead < maxBytes;
    const rawLines = text.split("\n");
    const lines = readWholeFile ? rawLines : rawLines.slice(0, -1);
    return lines.slice(0, maxLines);
  } finally {
    await fh.close();
  }
}

const SCAN_CHUNK_BYTES = 256 * 1024;
/** Enough to see `type`/`isSidechain` near the start of a JSONL record — both appear well within this in every sample checked. */
const CLASSIFY_WINDOW_BYTES = 4 * 1024;
/** Cap for lines we actually parse in full (custom-title/ai-title are always tiny in practice) — never for user/assistant/anything else. */
const MAX_MATERIALIZED_LINE_BYTES = 1024 * 1024;

type ScanLineKind =
  "unclassified" | "message" | "custom-title" | "ai-title" | "ignore";

/**
 * Streams the whole file once in fixed-size chunks, counting real
 * (non-sidechain) user/assistant messages and picking up the latest
 * `custom-title`/`ai-title` records seen. This is the only full-file pass we
 * do, and only on a cache miss (mtime changed since last scan).
 *
 * Why not readline: readline's `line` event hands you the *complete* line as
 * one string, however large — a single JSONL line can be many MB (a tool
 * result embedding a big file or image), so readline must fully buffer it
 * first. Buffer that per file, times however many files a background scan
 * runs concurrently, and it adds up to exactly the "JS heap out of memory"
 * crash reported on a machine with a large `~/.claude/projects`.
 *
 * Instead we track only a small amount of state per in-progress line:
 * - While a line is `"unclassified"`, we buffer up to `CLASSIFY_WINDOW_BYTES`
 *   of it — enough to see the `type`/`isSidechain` fields near the front of
 *   every real record — then classify it once that threshold is hit (or the
 *   line ends first, if it's short).
 * - Once classified as a plain message or something to ignore, we drop the
 *   buffered bytes immediately and just keep counting the byte length until
 *   the line's terminating `\n` shows up — the rest of a huge message line
 *   is never held in memory.
 * - Only `custom-title`/`ai-title` lines (always tiny in the data we've
 *   seen) keep accumulating, capped at `MAX_MATERIALIZED_LINE_BYTES`; if one
 *   ever exceeds that cap we give up on it rather than materialize an
 *   unbounded string.
 *
 * Net effect: peak memory held for any single line, no matter how large it
 * actually is on disk, is bounded by `MAX_MATERIALIZED_LINE_BYTES` (1MB).
 */
async function scanFullFile(
  filePath: string,
): Promise<{ messageCount: number; customTitle?: string; aiTitle?: string }> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, {
      highWaterMark: SCAN_CHUNK_BYTES,
    });
    let messageCount = 0;
    let customTitle: string | undefined;
    let aiTitle: string | undefined;

    // State for the line currently being accumulated across chunk callbacks.
    let lineChunks: Buffer[] = [];
    let lineBytes = 0;
    let kind: ScanLineKind = "unclassified";

    function classify() {
      const prefix = Buffer.concat(lineChunks).toString("utf8");
      if (
        prefix.includes('"type":"user"') ||
        prefix.includes('"type": "user"') ||
        prefix.includes('"type":"assistant"') ||
        prefix.includes('"type": "assistant"')
      ) {
        const isSidechain =
          prefix.includes('"isSidechain":true') ||
          prefix.includes('"isSidechain": true');
        kind = isSidechain ? "ignore" : "message";
        lineChunks = []; // decision made — never need the rest of this line.
      } else if (
        prefix.includes('"type":"custom-title"') ||
        prefix.includes('"type": "custom-title"')
      ) {
        kind = "custom-title"; // keep accumulating (bounded) for the real title string.
      } else if (
        prefix.includes('"type":"ai-title"') ||
        prefix.includes('"type": "ai-title"')
      ) {
        kind = "ai-title";
      } else {
        kind = "ignore";
        lineChunks = [];
      }
    }

    function finishLine() {
      if (kind === "unclassified") classify();
      if (kind === "message") {
        messageCount++;
      } else if (kind === "custom-title" || kind === "ai-title") {
        const full = Buffer.concat(lineChunks).toString("utf8");
        const record = safeParseLine(full);
        if (kind === "custom-title" && record?.customTitle)
          customTitle = record.customTitle;
        if (kind === "ai-title" && record?.aiTitle) aiTitle = record.aiTitle;
      }
      lineChunks = [];
      lineBytes = 0;
      kind = "unclassified";
    }

    stream.on("data", (rawChunk: Buffer | string) => {
      // No `encoding` option is passed to `createReadStream`, so this stream
      // always emits `Buffer`s in practice; the `string` half of the type is
      // just `Readable`'s generic signature, not a real runtime case here.
      const chunk =
        typeof rawChunk === "string" ? Buffer.from(rawChunk) : rawChunk;
      let offset = 0;
      while (offset < chunk.length) {
        const newlineIndex = chunk.indexOf(0x0a, offset);
        const end = newlineIndex === -1 ? chunk.length : newlineIndex;
        const piece = chunk.subarray(offset, end);

        if (
          (kind === "unclassified" ||
            kind === "custom-title" ||
            kind === "ai-title") &&
          lineBytes < MAX_MATERIALIZED_LINE_BYTES
        ) {
          lineChunks.push(piece);
        }
        lineBytes += piece.length;

        if (kind === "unclassified" && lineBytes >= CLASSIFY_WINDOW_BYTES) {
          classify();
        }
        if (
          (kind === "custom-title" || kind === "ai-title") &&
          lineBytes > MAX_MATERIALIZED_LINE_BYTES
        ) {
          // Exceeded the cap — give up on this one rather than keep growing.
          kind = "ignore";
          lineChunks = [];
        }

        if (newlineIndex !== -1) {
          finishLine();
          offset = newlineIndex + 1;
        } else {
          offset = chunk.length;
        }
      }
    });
    stream.on("end", () => {
      if (lineBytes > 0) finishLine();
      resolve({ messageCount, customTitle, aiTitle });
    });
    stream.on("error", reject);
  });
}

/** Reads the last `maxBytes` bytes of a file as text (used for detail previews). */
async function readTailText(
  filePath: string,
  size: number,
  maxBytes = TAIL_MAX_BYTES,
): Promise<string> {
  const start = Math.max(0, size - maxBytes);
  const fh = await fs.open(filePath, "r");
  try {
    const length = size - start;
    const buffer = Buffer.alloc(length);
    await fh.read(buffer, 0, length, start);
    return buffer.toString("utf8");
  } finally {
    await fh.close();
  }
}

interface HeadParseResult {
  cwd?: string;
  gitBranch?: string;
  slug?: string;
  entrypoint?: string;
  version?: string;
  createdAt?: string;
  firstPromptTitle: string;
  firstPromptFull: string;
}

async function parseHead(filePath: string): Promise<HeadParseResult> {
  const lines = await readHeadLines(filePath);
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let slug: string | undefined;
  let entrypoint: string | undefined;
  let version: string | undefined;
  let createdAt: string | undefined;
  let firstPromptTitle = "Untitled session";
  let firstPromptFull = "_No prompt text found._";
  let foundFirstPrompt = false;

  for (const line of lines) {
    const record = safeParseLine(line);
    if (!record) continue;
    if (record.type === "queue-operation" || record.type === "attachment")
      continue;
    if (record.isSidechain) continue;

    if (!cwd && record.cwd) cwd = record.cwd;
    if (!gitBranch && record.gitBranch) gitBranch = record.gitBranch;
    if (!slug && record.slug) slug = record.slug;
    if (!entrypoint && record.entrypoint) entrypoint = record.entrypoint;
    if (!version && record.version) version = record.version;
    if (
      !createdAt &&
      record.timestamp &&
      (record.type === "user" || record.type === "assistant")
    ) {
      createdAt = record.timestamp;
    }

    if (
      !foundFirstPrompt &&
      record.type === "user" &&
      record.message?.role === "user"
    ) {
      const rawText = extractText(record.message.content);
      const text = rawText ? extractRealPromptText(rawText) : undefined;
      if (text) {
        firstPromptTitle = truncateTitle(text);
        firstPromptFull = capText(text, 2000);
        foundFirstPrompt = true;
      }
    }
  }

  return {
    cwd,
    gitBranch,
    slug,
    entrypoint,
    version,
    createdAt,
    firstPromptTitle,
    firstPromptFull,
  };
}

interface TreeCacheEntry {
  fileMtime: number;
  data: {
    customTitle?: string;
    messageCount?: number;
  };
}

interface TreeCacheFile {
  sessions?: Record<string, TreeCacheEntry>;
}

/** Reads (read-only) a project's `.tree-cache.json`, if present. Never written to. */
async function readTreeCache(
  projectDir: string,
): Promise<Record<string, TreeCacheEntry>> {
  const path = join(projectDir, ".tree-cache.json");
  if (!existsSync(path)) return {};
  try {
    const raw = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(raw) as TreeCacheFile;
    return parsed.sessions ?? {};
  } catch {
    return {};
  }
}

interface CachedMeta {
  sessionId: string;
  cwd: string;
  gitBranch?: string;
  slug?: string;
  entrypoint?: string;
  version?: string;
  createdAt: string;
  firstPromptTitle: string;
  firstPromptFull: string;
  customTitle?: string;
  aiTitle?: string;
  messageCount: number;
}

/**
 * Parses one session file, using the mtime-keyed cache when possible.
 *
 * `sessionId` is the canonical identity for this session — it's the file's
 * basename (the UUID Claude Code itself uses for `claude --resume <uuid>` /
 * `claude://resume?session=<uuid>`), not the embedded `sessionId` field from
 * the JSONL content. In practice the two always agree, but the filename is
 * guaranteed to exist for every file (no parsing required) and is what the
 * CLI/desktop app actually key off of, so it's the source of truth here.
 */
async function parseSessionFile(
  filePath: string,
  projectDirName: string,
  mtimeMs: number,
  size: number,
  sessionId: string,
  cache: KeyValueCache,
): Promise<SessionMeta | undefined> {
  const cacheKey = `${filePath}:${mtimeMs}`;
  const cached = cache.get(cacheKey);
  let meta: CachedMeta | undefined;

  if (cached) {
    try {
      meta = JSON.parse(cached) as CachedMeta;
    } catch {
      meta = undefined;
    }
  }

  if (!meta) {
    const head = await parseHead(filePath);
    // Identity comes from the filename, not the embedded `sessionId` field (see
    // `sessionId` param below) — `cwd` is what we actually need out of the head
    // parse to consider this a valid, resumable session file.
    if (!head.cwd) return undefined;
    const full = await scanFullFile(filePath);
    meta = {
      sessionId,
      cwd: head.cwd,
      gitBranch: head.gitBranch,
      slug: head.slug,
      entrypoint: head.entrypoint,
      version: head.version,
      createdAt: head.createdAt ?? new Date(mtimeMs).toISOString(),
      firstPromptTitle: head.firstPromptTitle,
      firstPromptFull: head.firstPromptFull,
      customTitle: full.customTitle,
      aiTitle: full.aiTitle,
      messageCount: full.messageCount,
    };
    cache.set(cacheKey, JSON.stringify(meta));
  }

  return {
    sessionId: meta.sessionId,
    filePath,
    projectDirName,
    cwd: meta.cwd,
    gitBranch: meta.gitBranch,
    slug: meta.slug,
    entrypoint: meta.entrypoint,
    version: meta.version,
    createdAt: new Date(meta.createdAt),
    mtime: new Date(mtimeMs),
    size,
    firstPromptTitle: meta.firstPromptTitle,
    firstPromptFull: meta.firstPromptFull,
    customTitle: meta.customTitle,
    aiTitle: meta.aiTitle,
    messageCount: meta.messageCount,
  };
}

/**
 * Runs `fn` over `items` with at most `limit` calls in flight at once.
 *
 * `scanAllSessions` used to kick off a `parseSessionFile` call (which, on a
 * cache miss, does a full-file streaming scan) for *every* session file
 * across *every* project directory all at once via nested `Promise.all`.
 * On a small `~/.claude/projects` that's fine, but on a machine with a large
 * history — hundreds of session files, all cache-cold on a fresh clone — it
 * means hundreds of file streams and their per-line state all alive at the
 * same time. Each one alone is bounded (see `scanFullFile`), but unbounded
 * *concurrency* multiplies that bound by however many files exist, which is
 * exactly the kind of thing that scales fine on a laptop with a handful of
 * projects and blows the heap on one with years of history. Capping how
 * many run at once bounds total memory regardless of how many files exist.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }
  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/** How many full-file scans (`parseSessionFile` on a cache miss) run at once. */
const SCAN_CONCURRENCY = 3;

interface ScanTask {
  filePath: string;
  projectDirName: string;
  fileName: string;
  treeCache: Record<string, TreeCacheEntry>;
}

/**
 * Scans every session file under `~/.claude/projects`.
 *
 * `projectsDir` defaults to the real `~/.claude/projects` and is only ever
 * overridden by the synthetic stress test in `scripts/smoke.ts`, which points
 * it at a throwaway fixture directory instead — this module never writes to
 * or reads from anywhere else on a real machine.
 */
export async function scanAllSessions(
  cache: KeyValueCache,
  projectsDir: string = PROJECTS_DIR,
): Promise<SessionMeta[]> {
  if (!existsSync(projectsDir)) return [];
  const projectDirs = await fs.readdir(projectsDir, { withFileTypes: true });

  // First, cheaply gather every (dir, file) pair to scan across all project
  // directories into one flat list — listing directories and reading small
  // `.tree-cache.json` files is not the expensive part, so it's fine to do
  // this part concurrently; only the per-file parse below is pooled.
  const tasksByDir = await Promise.all(
    projectDirs
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map(async (entry): Promise<ScanTask[]> => {
        const projectDir = join(projectsDir, entry.name);
        let files: string[];
        try {
          files = (await fs.readdir(projectDir)).filter(
            (f) => f.endsWith(".jsonl") && !f.startsWith("."),
          );
        } catch {
          return [];
        }
        const treeCache = await readTreeCache(projectDir);
        return files.map((fileName) => ({
          filePath: join(projectDir, fileName),
          projectDirName: entry.name,
          fileName,
          treeCache,
        }));
      }),
  );
  const tasks = tasksByDir.flat();

  const sessions = await mapWithConcurrency(
    tasks,
    SCAN_CONCURRENCY,
    async (task): Promise<SessionMeta | undefined> => {
      let stat;
      try {
        stat = await fs.stat(task.filePath);
      } catch {
        return undefined;
      }
      if (stat.size === 0) return undefined;

      const sessionId = basename(task.fileName, ".jsonl");

      let session: SessionMeta | undefined;
      try {
        session = await parseSessionFile(
          task.filePath,
          task.projectDirName,
          stat.mtimeMs,
          stat.size,
          sessionId,
          cache,
        );
      } catch {
        return undefined;
      }
      if (!session) return undefined;

      const treeEntry = task.treeCache[sessionId];
      if (
        treeEntry &&
        treeEntry.fileMtime === stat.mtimeMs &&
        treeEntry.data?.customTitle
      ) {
        session.customTitle = session.customTitle ?? treeEntry.data.customTitle;
      }

      return session;
    },
  );

  const results = sessions.filter((s): s is SessionMeta => s !== undefined);
  const deduped = dedupeBySessionId(results);
  deduped.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return deduped;
}

/**
 * A single logical session can end up as two files with the same UUID
 * filename in two different project directories — e.g. a conversation is
 * resumed from a different `cwd` (a worktree gets removed and the same
 * session id is continued from the parent checkout) and the storage bucket
 * is keyed by cwd, not just session id. When that happens, keep only the
 * most recently modified file for that session id so the list never shows
 * two rows (and never hands React two items with the same key) for what's
 * really one conversation.
 */
function dedupeBySessionId(sessions: SessionMeta[]): SessionMeta[] {
  const bySessionId = new Map<string, SessionMeta>();
  for (const session of sessions) {
    const existing = bySessionId.get(session.sessionId);
    if (!existing || session.mtime.getTime() > existing.mtime.getTime()) {
      bySessionId.set(session.sessionId, session);
    }
  }
  return Array.from(bySessionId.values());
}

/** Reads the last few real messages of a session file for the detail preview. */
export async function getSessionPreview(
  filePath: string,
  size: number,
): Promise<SessionPreviewMessage[]> {
  const tail = await readTailText(filePath, size);
  const rawLines = tail.split("\n").filter(Boolean);
  // The first line of a tail read is very likely a truncated partial line; drop it
  // unless the tail read happened to cover the whole file.
  const lines = size > TAIL_MAX_BYTES ? rawLines.slice(1) : rawLines;

  const messages: SessionPreviewMessage[] = [];
  for (
    let i = lines.length - 1;
    i >= 0 && messages.length < PREVIEW_MESSAGE_COUNT;
    i--
  ) {
    const record = safeParseLine(lines[i]);
    if (!record || record.isSidechain) continue;
    if (record.type !== "user" && record.type !== "assistant") continue;
    const role = record.message?.role;
    if (role !== "user" && role !== "assistant") continue;
    const rawText = extractText(record.message?.content);
    if (!rawText) continue;
    const text = role === "user" ? extractRealPromptText(rawText) : rawText;
    if (!text) continue;
    messages.push({ role, text: capText(text, 1000) });
  }
  return messages.reverse();
}
