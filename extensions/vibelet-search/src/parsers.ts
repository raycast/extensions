import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { ensureRipgrep } from "./ripgrep";
import {
  claudeAdapter,
  codexAdapter,
  cleanTitle,
  getAdapter,
  getFormatForSource,
  isMeaningfulUserMessage,
} from "./format-adapters";
import type {
  ClaudeAppSessionFile,
  ClaudeSessionIndexFile,
  CodexConversationLine,
  CodexIndexLine,
  SessionFormat,
  SessionMessage,
  SessionMeta,
} from "./types";

/** Marker that the Codex desktop app writes in `payload.originator` of session_meta. */
const CODEX_APP_ORIGINATOR = "Codex Desktop";
const DEFAULT_MAX_LOADED_MESSAGES = 500;
const DEFAULT_MAX_MESSAGE_CHARS = 12000;
const DEFAULT_MAX_JSONL_LINE_BYTES = 2 * 1024 * 1024;
const TRUNCATED_MESSAGE_SUFFIX = "\n\n[Message truncated to keep Raycast responsive.]";

/** Internal logging — surfaces in `ray develop` console without breaking the user. */
function warn(...args: unknown[]): void {
  console.warn("[vibelet]", ...args);
}

/**
 * Read up to `maxBytes` from the head of a JSONL file and return parsed objects.
 * Used by title extraction to avoid loading multi-MB conversation files just to grab the first message.
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function safeMtimeMs(filePath: string): Promise<number> {
  try {
    return (await fs.promises.stat(filePath)).mtimeMs;
  } catch {
    return 0;
  }
}

async function readJsonlHead(filePath: string, maxBytes: number = 65536): Promise<unknown[]> {
  let handle: Awaited<ReturnType<typeof fs.promises.open>> | undefined;
  try {
    handle = await fs.promises.open(filePath, "r");
    const stat = await handle.stat();
    const readSize = Math.min(maxBytes, stat.size);
    if (readSize === 0) return [];
    const buf = Buffer.alloc(readSize);
    await handle.read(buf, 0, readSize, 0);

    const chunk = buf.toString("utf-8", 0, readSize);
    const lines = chunk.split("\n");
    // Discard last line if we cut mid-line (only when we didn't read the whole file)
    if (readSize < stat.size && lines.length > 1) lines.pop();

    const results: unknown[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        results.push(JSON.parse(line));
      } catch {
        // Single malformed JSONL line — skip but keep parsing the rest
      }
    }
    return results;
  } catch (e) {
    warn(`readJsonlHead failed for ${filePath}:`, e);
    return [];
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // already closed
      }
    }
  }
}

/**
 * Extract a session title from a JSONL file by finding the first meaningful user message.
 *
 * For Claude files, also returns the `cwd` field carried on each line — the project
 * directory name under `~/.claude/projects/` is a lossy `-` substitution and can't be
 * reversed back to the real path, so the only reliable source is the JSONL content.
 */
async function extractTitleFromFile(
  filePath: string,
  format: SessionFormat,
): Promise<{ title: string; timestamp: string; cwd: string }> {
  const adapter = getAdapter(format);
  // Codex sessions can have a very long AGENTS.md as the first user message; read more bytes
  const maxBytes = format === "codex" ? 131072 : 65536;
  const lines = await readJsonlHead(filePath, maxBytes);

  let title = "";
  let timestamp = "";
  let cwd = "";

  for (const raw of lines) {
    if (!cwd && format === "claude" && raw && typeof raw === "object") {
      const maybeCwd = (raw as { cwd?: unknown }).cwd;
      if (typeof maybeCwd === "string" && maybeCwd) cwd = maybeCwd;
    }

    if (!title) {
      const parsed = adapter.parseLine(raw);
      if (
        parsed &&
        parsed.role === "user" &&
        parsed.content.trim().length >= 3 &&
        isMeaningfulUserMessage(parsed.content)
      ) {
        title = cleanTitle(parsed.content);
        timestamp = parsed.timestamp;
      }
    }

    if (title && (format !== "claude" || cwd)) break;
  }

  return { title: title || "Untitled Session", timestamp, cwd };
}

/**
 * Load only metadata (title, path, timestamp) for all Claude Code CLI sessions.
 * Does NOT read full message content — used for the initial list render.
 */
export async function loadClaudeCliSessionMetas(): Promise<SessionMeta[]> {
  const homeDir = os.homedir();
  const sessionsDir = path.join(homeDir, ".claude", "sessions");
  const projectsDir = path.join(homeDir, ".claude", "projects");

  // Build map of sessionId -> session index file (for cwd + start timestamp)
  const sessionIndex = new Map<string, ClaudeSessionIndexFile>();
  if (await pathExists(sessionsDir)) {
    try {
      for (const file of await fs.promises.readdir(sessionsDir)) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = await fs.promises.readFile(path.join(sessionsDir, file), "utf-8");
          const meta = JSON.parse(content) as ClaudeSessionIndexFile;
          if (meta.sessionId) sessionIndex.set(meta.sessionId, meta);
        } catch (e) {
          warn(`failed to parse claude session index ${file}:`, e);
        }
      }
    } catch (e) {
      warn("failed to read ~/.claude/sessions:", e);
    }
  }

  if (!(await pathExists(projectsDir))) return [];

  const results: SessionMeta[] = [];

  try {
    for (const projDir of await fs.promises.readdir(projectsDir)) {
      const projPath = path.join(projectsDir, projDir);
      try {
        if (!(await fs.promises.stat(projPath)).isDirectory()) continue;
      } catch {
        continue;
      }

      let jsonlFiles: string[];
      try {
        jsonlFiles = (await fs.promises.readdir(projPath)).filter((f) => f.endsWith(".jsonl"));
      } catch (e) {
        warn(`failed to read claude project dir ${projDir}:`, e);
        continue;
      }

      for (const jsonlFile of jsonlFiles) {
        const sessionId = jsonlFile.replace(".jsonl", "");
        const filePath = path.join(projPath, jsonlFile);

        let mtime = 0;
        try {
          mtime = (await fs.promises.stat(filePath)).mtimeMs;
        } catch {
          // Use 0 — file will sort to the bottom
        }

        const indexEntry = sessionIndex.get(sessionId);
        const { title, timestamp: firstMsgTs, cwd: cwdFromFile } = await extractTitleFromFile(filePath, "claude");

        const firstMsgEpoch = firstMsgTs ? new Date(firstMsgTs).getTime() : NaN;
        const timestamp = indexEntry?.startedAt ?? (Number.isFinite(firstMsgEpoch) ? firstMsgEpoch : mtime);

        // Priority: session index cwd > cwd embedded in JSONL > "" (skip cd in resume cmd).
        // We don't fall back to the encoded dir name — it's lossy (each non-alnum char → `-`),
        // so decoding "-Users-bytedance-personal-midscene-10" produces a path that doesn't exist.
        results.push({
          id: sessionId,
          title,
          source: "claude-cli",
          projectPath: indexEntry?.cwd || cwdFromFile || "",
          timestamp,
          filePath,
        });
      }
    }
  } catch (e) {
    warn("failed to scan ~/.claude/projects:", e);
  }

  return results;
}

/**
 * Encode a project cwd into Claude's projects/<encoded> directory name.
 *
 * Verified by inspecting existing `~/.claude/projects/` directories:
 * each unsafe character (anything outside [A-Za-z0-9-]) is replaced with a
 * single `-`, **without collapsing runs** — so `/.claude` → `--claude`
 * (two dashes, one from `/`, one from `.`).
 */
function encodeClaudeProjectDir(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9-]/g, "-");
}

/**
 * Load metadata for Claude Desktop app sessions.
 * Walks `~/Library/Application Support/Claude/claude-code-sessions/<user>/<workspace>/local_*.json`
 * and resolves each entry's conversation jsonl in `~/.claude/projects/<encoded-cwd>/<cliSessionId>.jsonl`.
 *
 * Sessions whose conversation jsonl can't be located are still surfaced (so they appear in the list),
 * but their content/search will be empty.
 */
export async function loadClaudeAppSessionMetas(): Promise<SessionMeta[]> {
  const homeDir = os.homedir();
  const appSessionsDir = path.join(homeDir, "Library", "Application Support", "Claude", "claude-code-sessions");
  const projectsDir = path.join(homeDir, ".claude", "projects");

  if (!(await pathExists(appSessionsDir))) return [];

  const metaFiles: string[] = [];
  try {
    // Two levels deep: <user>/<workspace>/local_*.json
    for (const userDir of await fs.promises.readdir(appSessionsDir)) {
      const userPath = path.join(appSessionsDir, userDir);
      let userStat;
      try {
        userStat = await fs.promises.stat(userPath);
      } catch {
        continue;
      }
      if (!userStat.isDirectory()) continue;

      for (const workspaceDir of await fs.promises.readdir(userPath)) {
        const workspacePath = path.join(userPath, workspaceDir);
        let workspaceStat;
        try {
          workspaceStat = await fs.promises.stat(workspacePath);
        } catch {
          continue;
        }
        if (!workspaceStat.isDirectory()) continue;

        let entries: string[] = [];
        try {
          entries = await fs.promises.readdir(workspacePath);
        } catch {
          continue;
        }
        for (const entry of entries) {
          if (entry.startsWith("local_") && entry.endsWith(".json")) {
            metaFiles.push(path.join(workspacePath, entry));
          }
        }
      }
    }
  } catch (e) {
    warn("failed to scan Claude app sessions dir:", e);
    return [];
  }

  const results: SessionMeta[] = [];
  for (const metaPath of metaFiles) {
    let appMeta: ClaudeAppSessionFile;
    try {
      appMeta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8")) as ClaudeAppSessionFile;
    } catch (e) {
      warn(`failed to parse Claude app session ${metaPath}:`, e);
      continue;
    }

    const cliSessionId = appMeta.cliSessionId;
    const cwd = appMeta.cwd || appMeta.originCwd || "";

    // Resolve the conversation jsonl. Without cliSessionId+cwd we can't locate it.
    let convoPath = "";
    if (cliSessionId && cwd) {
      const candidate = path.join(projectsDir, encodeClaudeProjectDir(cwd), `${cliSessionId}.jsonl`);
      if (await pathExists(candidate)) convoPath = candidate;
    }

    // Some sessions write a title via the app ("Session 222" placeholder when titleSource=auto).
    // Prefer real titles; for auto/placeholder, fall back to first message extraction.
    let title = appMeta.title?.trim() || "";
    const looksPlaceholder = !title || /^Session\s+\d+$/i.test(title);
    if (looksPlaceholder && convoPath) {
      const fromContent = (await extractTitleFromFile(convoPath, "claude")).title;
      if (fromContent && fromContent !== "Untitled Session") title = fromContent;
    }
    if (!title) title = "Untitled Session";

    const convoMtime = convoPath ? await safeMtimeMs(convoPath) : 0;
    const timestamp = appMeta.lastActivityAt || appMeta.createdAt || convoMtime || (await safeMtimeMs(metaPath));

    results.push({
      id: cliSessionId || appMeta.sessionId,
      title,
      source: "claude-app",
      projectPath: cwd,
      timestamp,
      filePath: convoPath || metaPath,
      prUrl: appMeta.prUrl,
      prNumber: appMeta.prNumber,
    });
  }

  return results;
}

/**
 * Walk a directory tree and return all `.jsonl` file paths.
 */
async function walkJsonlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (e) {
    warn(`failed to read directory ${dir}:`, e);
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonlFiles(fullPath)));
    } else if (entry.name.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Codex session_meta lines can be large (sometimes >15 KB) because the legacy format embeds
 * the full system instructions inline. Read enough bytes so a normal session_meta is captured;
 * pathologically huge first lines (> CODEX_META_READ_BYTES) are skipped with a warning.
 */
const CODEX_META_READ_BYTES = 256 * 1024;

/**
 * Read the first JSONL line of a Codex session file to extract id/cwd/timestamp.
 * Returns `null` if the line can't be parsed or doesn't carry session metadata.
 */
export function parseCodexSessionMetaLine(parsed: CodexConversationLine): {
  id: string;
  projectPath: string;
  ts: number;
  originator?: string;
} | null {
  // New format: { type: "session_meta", payload: { id, cwd, originator, ... } }
  if (parsed.type === "session_meta" && parsed.payload?.id) {
    return {
      id: parsed.payload.id,
      projectPath: parsed.payload.cwd || "",
      ts: parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0,
      originator: parsed.payload.originator,
    };
  }

  // Old format: { id, timestamp, instructions, git? } — no `type` field, no originator
  if (parsed.id && parsed.timestamp && !parsed.type) {
    return {
      id: parsed.id,
      projectPath: parsed.git?.cwd || "",
      ts: new Date(parsed.timestamp).getTime(),
    };
  }

  return null;
}

async function readCodexSessionMeta(
  filePath: string,
): Promise<{ id: string; projectPath: string; ts: number; originator?: string } | null> {
  const lines = await readJsonlHead(filePath, CODEX_META_READ_BYTES);
  if (lines.length === 0) return null;
  return parseCodexSessionMetaLine(lines[0] as CodexConversationLine);
}

/**
 * Load only metadata for all Codex sessions.
 */
export async function loadCodexSessionMetas(): Promise<SessionMeta[]> {
  const homeDir = os.homedir();
  const codexDir = path.join(homeDir, ".codex");
  const indexPath = path.join(codexDir, "session_index.jsonl");
  const sessionsDir = path.join(codexDir, "sessions");

  if (!(await pathExists(codexDir))) return [];

  // Build title index from session_index.jsonl (only covers a subset of sessions)
  const titleMap = new Map<string, { name: string; updatedAt: string }>();
  if (await pathExists(indexPath)) {
    try {
      const content = await fs.promises.readFile(indexPath, "utf-8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as CodexIndexLine;
          titleMap.set(parsed.id, { name: parsed.thread_name, updatedAt: parsed.updated_at });
        } catch (e) {
          warn("failed to parse codex index line:", e);
        }
      }
    } catch (e) {
      warn("failed to read codex session_index.jsonl:", e);
    }
  }

  if (!(await pathExists(sessionsDir))) return [];

  const results: SessionMeta[] = [];

  for (const filePath of await walkJsonlFiles(sessionsDir)) {
    const sessionMeta = await readCodexSessionMeta(filePath);
    if (!sessionMeta) continue;

    const indexInfo = titleMap.get(sessionMeta.id);
    const title = indexInfo?.name || (await extractTitleFromFile(filePath, "codex")).title;
    const source = sessionMeta.originator === CODEX_APP_ORIGINATOR ? "codex-app" : "codex-cli";

    results.push({
      id: sessionMeta.id,
      title,
      source,
      projectPath: sessionMeta.projectPath,
      timestamp: indexInfo ? new Date(indexInfo.updatedAt).getTime() : sessionMeta.ts,
      filePath,
    });
  }

  return results;
}

/**
 * Load all session metas from every source, sorted by recency.
 *
 * Deduplication: a Claude Desktop app session reuses the underlying CLI conversation jsonl
 * (`cliSessionId` → `~/.claude/projects/<encoded>/<id>.jsonl`). When both sources surface
 * the same id, the app entry wins because it carries richer metadata (true title, PR link,
 * activity timestamp). Codex CLI vs App is also keyed by id but currently lives in disjoint
 * sets — we still dedupe to be safe.
 */
export async function loadAllSessionMetas(): Promise<SessionMeta[]> {
  const [claudeCli, claudeApp, codex] = await Promise.all([
    loadClaudeCliSessionMetas(),
    loadClaudeAppSessionMetas(),
    loadCodexSessionMetas(),
  ]);

  const merged = new Map<string, SessionMeta>();

  // Insert in order of *increasing* precedence so the last writer wins.
  for (const m of claudeCli) merged.set(`claude:${m.id}`, m);
  for (const m of claudeApp) merged.set(`claude:${m.id}`, m);

  for (const m of codex) {
    const key = `codex:${m.id}`;
    const existing = merged.get(key);
    // If both sources somehow saw the same id, prefer codex-app over codex-cli.
    if (!existing || m.source === "codex-app") merged.set(key, m);
  }

  return [...merged.values()].sort((a, b) => b.timestamp - a.timestamp);
}

// --- Content loading (on demand) ---

export interface LoadSessionMessagesOptions {
  /**
   * Upper bound for rendered/copied messages. Large sessions can contain tens of
   * thousands of turns; keeping a bounded preview avoids Raycast's 100 MB worker heap.
   */
  maxMessages?: number;
  /** Upper bound for each parsed message body before it is stored in React state. */
  maxMessageChars?: number;
  /** Upper bound for a raw JSONL line. Lines above this are skipped while streaming. */
  maxLineBytes?: number;
}

function truncateMessageContent(msg: SessionMessage, maxChars: number): SessionMessage {
  if (msg.content.length <= maxChars) return msg;
  return { ...msg, content: msg.content.slice(0, maxChars) + TRUNCATED_MESSAGE_SUFFIX };
}

async function* readJsonlLines(filePath: string, maxLineBytes: number): AsyncGenerator<string> {
  const stream = fs.createReadStream(filePath, { encoding: "utf-8", highWaterMark: 64 * 1024 });
  let buffered = "";
  let bufferedBytes = 0;
  let skippingLongLine = false;

  try {
    for await (const chunk of stream) {
      const text = String(chunk);
      let start = 0;

      while (start < text.length) {
        const newlineIndex = text.indexOf("\n", start);
        const segmentEnd = newlineIndex === -1 ? text.length : newlineIndex;
        const segment = text.slice(start, segmentEnd);

        if (!skippingLongLine) {
          buffered += segment;
          bufferedBytes += Buffer.byteLength(segment, "utf-8");
          if (bufferedBytes > maxLineBytes) {
            buffered = "";
            bufferedBytes = 0;
            skippingLongLine = true;
          }
        }

        if (newlineIndex === -1) break;

        if (skippingLongLine) {
          skippingLongLine = false;
        } else {
          yield buffered.endsWith("\r") ? buffered.slice(0, -1) : buffered;
        }
        buffered = "";
        bufferedBytes = 0;
        start = newlineIndex + 1;
      }
    }

    if (!skippingLongLine && buffered) {
      yield buffered.endsWith("\r") ? buffered.slice(0, -1) : buffered;
    }
  } finally {
    stream.destroy();
  }
}

/**
 * Load messages for a single session without reading the whole JSONL file into memory.
 * Called lazily when the user opens the detail view.
 */
export async function loadSessionMessages(
  meta: SessionMeta,
  options: LoadSessionMessagesOptions = {},
): Promise<SessionMessage[]> {
  const adapter = getAdapter(getFormatForSource(meta.source));
  const messages: SessionMessage[] = [];
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_LOADED_MESSAGES;
  const maxMessageChars = options.maxMessageChars ?? DEFAULT_MAX_MESSAGE_CHARS;
  const maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_JSONL_LINE_BYTES;

  try {
    for await (const line of readJsonlLines(meta.filePath, maxLineBytes)) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      const msg = adapter.parseLine(parsed);
      if (!msg) continue;
      // Suppress auto-injected user-role events (system reminders, hook output, slash-command
      // wrappers, interrupted-by-user markers, ...) so the conversation view shows only what
      // the user actually typed and the assistant actually said.
      if (msg.role === "user" && !isMeaningfulUserMessage(msg.content)) continue;
      messages.push(truncateMessageContent(msg, maxMessageChars));
      if (messages.length >= maxMessages) break;
    }
  } catch (e) {
    warn(`failed to read session ${meta.filePath}:`, e);
    return messages;
  }

  return messages;
}

// --- Content search ---

/**
 * Build a clean snippet around the matched query inside a parsed message body.
 */
function buildSnippet(text: string, lowerQuery: string, queryLength: number): string {
  const idx = text.toLowerCase().indexOf(lowerQuery);
  if (idx === -1) return text.slice(0, 160).replace(/\s+/g, " ");
  const s = Math.max(0, idx - 50);
  const e = Math.min(text.length, idx + queryLength + 50);
  return (s > 0 ? "..." : "") + text.slice(s, e).replace(/\s+/g, " ") + (e < text.length ? "..." : "");
}

/**
 * Search content across all session files using ripgrep.
 * Returns a map of filePath -> snippet. Limited to `limit` matches.
 *
 * Async so the Raycast extension worker stays responsive while ripgrep runs:
 * a synchronous spawn here would stall the IPC channel to the host on every
 * keystroke that triggers a content search.
 */
const execFileAsync = promisify(execFile);

export function buildRipgrepArgs(query: string, searchDirs: string[]): string[] {
  return [
    "--fixed-strings",
    "--ignore-case",
    "--max-count",
    "1",
    "--max-columns",
    "2048",
    "--max-columns-preview",
    "--max-filesize",
    "20M",
    "--glob",
    "*.jsonl",
    "--no-heading",
    "--with-filename",
    "--line-number",
    "--",
    query,
    ...searchDirs,
  ];
}

// Returns tuples (not a Map) because the result flows through useCachedPromise's
// JSON-serializing cache; a Map rehydrates as {} and breaks iteration.
export async function searchSessionContent(query: string, limit: number): Promise<Array<[string, string]>> {
  const results = new Map<string, string>();
  if (!query.trim() || query.length < 2) return [];

  const rgPath = await ensureRipgrep();

  const homeDir = os.homedir();
  const searchDirs = [path.join(homeDir, ".claude", "projects"), path.join(homeDir, ".codex", "sessions")].filter((d) =>
    fs.existsSync(d),
  );
  if (searchDirs.length === 0) return [];

  let output: string;
  try {
    const { stdout } = await execFileAsync(rgPath, buildRipgrepArgs(query, searchDirs), {
      encoding: "utf-8",
      maxBuffer: 2 * 1024 * 1024,
      timeout: 15000,
    });
    output = stdout;
  } catch (err) {
    // ripgrep exits with code 1 when there are no matches — that's not an error.
    // Anything else (timeouts, OOM, ENOENT, code >= 2) IS an error and should be surfaced.
    const e = err as { code?: number; stderr?: string | Buffer; message?: string };
    if (e.code === 1) return [];
    const stderrText = typeof e.stderr === "string" ? e.stderr : e.stderr?.toString();
    warn(`ripgrep search failed (code=${e.code}):`, stderrText || e.message);
    throw new Error(stderrText || e.message || "ripgrep search failed");
  }

  const lowerQuery = query.toLowerCase();
  const queryLength = query.length;

  for (const line of output.split("\n")) {
    if (results.size >= limit) break;
    if (!line) continue;

    // Format: /path/to/file.jsonl:lineNum:matchedContent
    const firstColon = line.indexOf(":");
    if (firstColon === -1) continue;
    const secondColon = line.indexOf(":", firstColon + 1);
    if (secondColon === -1) continue;

    const filePath = line.slice(0, firstColon);
    const matchedJsonLine = line.slice(secondColon + 1);

    // Parse the matched JSONL line through the same adapter the rest of the code uses,
    // so we get a clean text snippet (no JSON noise).
    let snippet: string;
    try {
      const parsed = JSON.parse(matchedJsonLine);
      const adapter = filePath.includes("/.codex/") ? codexAdapter : claudeAdapter;
      const msg = adapter.parseLine(parsed);
      snippet = msg
        ? buildSnippet(msg.content, lowerQuery, queryLength)
        : matchedJsonLine.slice(0, 160).replace(/\s+/g, " ");
    } catch {
      snippet = matchedJsonLine.slice(0, 160).replace(/\s+/g, " ");
    }

    results.set(filePath, snippet);
  }

  return Array.from(results);
}
