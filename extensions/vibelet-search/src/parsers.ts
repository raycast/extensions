import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
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

/** Internal logging — surfaces in `ray develop` console without breaking the user. */
function warn(...args: unknown[]): void {
  console.warn("[vibelet]", ...args);
}

/**
 * Read up to `maxBytes` from the head of a JSONL file and return parsed objects.
 * Used by title extraction to avoid loading multi-MB conversation files just to grab the first message.
 */
function readJsonlHead(filePath: string, maxBytes: number = 65536): unknown[] {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(maxBytes, stat.size);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, 0);

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
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
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
function extractTitleFromFile(
  filePath: string,
  format: SessionFormat,
): { title: string; timestamp: string; cwd: string } {
  const adapter = getAdapter(format);
  // Codex sessions can have a very long AGENTS.md as the first user message; read more bytes
  const maxBytes = format === "codex" ? 131072 : 65536;
  const lines = readJsonlHead(filePath, maxBytes);

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
export function loadClaudeCliSessionMetas(): SessionMeta[] {
  const homeDir = os.homedir();
  const sessionsDir = path.join(homeDir, ".claude", "sessions");
  const projectsDir = path.join(homeDir, ".claude", "projects");

  // Build map of sessionId -> session index file (for cwd + start timestamp)
  const sessionIndex = new Map<string, ClaudeSessionIndexFile>();
  if (fs.existsSync(sessionsDir)) {
    try {
      for (const file of fs.readdirSync(sessionsDir)) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = fs.readFileSync(path.join(sessionsDir, file), "utf-8");
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

  if (!fs.existsSync(projectsDir)) return [];

  const results: SessionMeta[] = [];

  try {
    for (const projDir of fs.readdirSync(projectsDir)) {
      const projPath = path.join(projectsDir, projDir);
      try {
        if (!fs.statSync(projPath).isDirectory()) continue;
      } catch {
        continue;
      }

      let jsonlFiles: string[];
      try {
        jsonlFiles = fs.readdirSync(projPath).filter((f) => f.endsWith(".jsonl"));
      } catch (e) {
        warn(`failed to read claude project dir ${projDir}:`, e);
        continue;
      }

      for (const jsonlFile of jsonlFiles) {
        const sessionId = jsonlFile.replace(".jsonl", "");
        const filePath = path.join(projPath, jsonlFile);

        let mtime = 0;
        try {
          mtime = fs.statSync(filePath).mtimeMs;
        } catch {
          // Use 0 — file will sort to the bottom
        }

        const indexEntry = sessionIndex.get(sessionId);
        const { title, timestamp: firstMsgTs, cwd: cwdFromFile } = extractTitleFromFile(filePath, "claude");

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
export function loadClaudeAppSessionMetas(): SessionMeta[] {
  const homeDir = os.homedir();
  const appSessionsDir = path.join(homeDir, "Library", "Application Support", "Claude", "claude-code-sessions");
  const projectsDir = path.join(homeDir, ".claude", "projects");

  if (!fs.existsSync(appSessionsDir)) return [];

  const metaFiles: string[] = [];
  try {
    // Two levels deep: <user>/<workspace>/local_*.json
    for (const userDir of fs.readdirSync(appSessionsDir)) {
      const userPath = path.join(appSessionsDir, userDir);
      let userStat;
      try {
        userStat = fs.statSync(userPath);
      } catch {
        continue;
      }
      if (!userStat.isDirectory()) continue;

      for (const workspaceDir of fs.readdirSync(userPath)) {
        const workspacePath = path.join(userPath, workspaceDir);
        let workspaceStat;
        try {
          workspaceStat = fs.statSync(workspacePath);
        } catch {
          continue;
        }
        if (!workspaceStat.isDirectory()) continue;

        let entries: string[] = [];
        try {
          entries = fs.readdirSync(workspacePath);
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
      appMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as ClaudeAppSessionFile;
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
      if (fs.existsSync(candidate)) convoPath = candidate;
    }

    // Some sessions write a title via the app ("Session 222" placeholder when titleSource=auto).
    // Prefer real titles; for auto/placeholder, fall back to first message extraction.
    let title = appMeta.title?.trim() || "";
    const looksPlaceholder = !title || /^Session\s+\d+$/i.test(title);
    if (looksPlaceholder && convoPath) {
      const fromContent = extractTitleFromFile(convoPath, "claude").title;
      if (fromContent && fromContent !== "Untitled Session") title = fromContent;
    }
    if (!title) title = "Untitled Session";

    const timestamp =
      appMeta.lastActivityAt || appMeta.createdAt || (convoPath ? safeMtimeMs(convoPath) : 0) || safeMtimeMs(metaPath);

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

function safeMtimeMs(p: string): number {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Walk a directory tree and return all `.jsonl` file paths.
 */
function walkJsonlFiles(dir: string): string[] {
  const files: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    warn(`failed to read directory ${dir}:`, e);
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonlFiles(fullPath));
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

function readCodexSessionMeta(
  filePath: string,
): { id: string; projectPath: string; ts: number; originator?: string } | null {
  const lines = readJsonlHead(filePath, CODEX_META_READ_BYTES);
  if (lines.length === 0) return null;
  return parseCodexSessionMetaLine(lines[0] as CodexConversationLine);
}

/**
 * Load only metadata for all Codex sessions.
 */
export function loadCodexSessionMetas(): SessionMeta[] {
  const homeDir = os.homedir();
  const codexDir = path.join(homeDir, ".codex");
  const indexPath = path.join(codexDir, "session_index.jsonl");
  const sessionsDir = path.join(codexDir, "sessions");

  if (!fs.existsSync(codexDir)) return [];

  // Build title index from session_index.jsonl (only covers a subset of sessions)
  const titleMap = new Map<string, { name: string; updatedAt: string }>();
  if (fs.existsSync(indexPath)) {
    try {
      const content = fs.readFileSync(indexPath, "utf-8");
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

  if (!fs.existsSync(sessionsDir)) return [];

  const results: SessionMeta[] = [];

  for (const filePath of walkJsonlFiles(sessionsDir)) {
    const sessionMeta = readCodexSessionMeta(filePath);
    if (!sessionMeta) continue;

    const indexInfo = titleMap.get(sessionMeta.id);
    const title = indexInfo?.name || extractTitleFromFile(filePath, "codex").title;
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
export function loadAllSessionMetas(): SessionMeta[] {
  const claudeCli = loadClaudeCliSessionMetas();
  const claudeApp = loadClaudeAppSessionMetas();
  const codex = loadCodexSessionMetas();

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

/**
 * Load all messages for a single session. Reads the entire JSONL file.
 * Called lazily when the user opens the detail view.
 */
export function loadSessionMessages(meta: SessionMeta): SessionMessage[] {
  let content: string;
  try {
    content = fs.readFileSync(meta.filePath, "utf-8");
  } catch (e) {
    warn(`failed to read session ${meta.filePath}:`, e);
    return [];
  }

  const adapter = getAdapter(getFormatForSource(meta.source));
  const messages: SessionMessage[] = [];

  for (const line of content.split("\n")) {
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
    messages.push(msg);
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
 * `null` = tried and failed; `undefined` = not yet tried.
 */
let cachedRipgrepPath: string | undefined | null;

/**
 * Locate a usable `rg` binary.
 *
 * Strategy: `prepare-assets` copies the postinstalled binary into `assets/rg`,
 * and `ray build` ships that next to the bundled JS — so the primary candidate
 * is `__dirname/assets/rg`. We then fall back to local `node_modules` (dev mode)
 * and a small fixed list of system locations.
 *
 * No subprocess probing per candidate: `fs.accessSync(X_OK)` keeps cold-start
 * under ~5ms even on the worst-case fall-through. We don't scan `$PATH` —
 * a typical `$PATH` has 20+ directories and the previous design did a child
 * spawn per miss (1s timeout each), which froze the worker for tens of seconds
 * when ripgrep was absent.
 */
function resolveRipgrepPath(): string | undefined {
  if (cachedRipgrepPath !== undefined) return cachedRipgrepPath ?? undefined;

  const binaryName = process.platform === "win32" ? "rg.exe" : "rg";
  const extensionDir = typeof __dirname === "string" ? __dirname : process.cwd();

  const candidates = [
    // Bundled with the extension (preferred — written here by scripts/copy-ripgrep.cjs
    // and packaged into the .ray bundle by `ray build`).
    path.join(extensionDir, "assets", binaryName),
    path.join(process.cwd(), "assets", binaryName),
    // Source location during local dev.
    path.join(process.cwd(), "node_modules", "@vscode", "ripgrep", "bin", binaryName),
    // System fallbacks: Apple-Silicon brew → Intel brew → /usr/local → /usr/bin.
    "/opt/homebrew/bin/rg",
    "/usr/local/bin/rg",
    "/usr/bin/rg",
  ];

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      cachedRipgrepPath = candidate;
      return candidate;
    } catch {
      // try next
    }
  }

  cachedRipgrepPath = null;
  return undefined;
}

/**
 * Search content across all session files using ripgrep.
 * Returns a map of filePath -> snippet. Limited to `limit` matches.
 *
 * Ripgrep runs as a subprocess so we don't pull hundreds of MB of JSONL into the Raycast Worker
 * heap. We then parse each matched line through our adapters to extract a clean text snippet.
 */
export function searchSessionContent(query: string, limit: number): Map<string, string> {
  const results = new Map<string, string>();
  if (!query.trim() || query.length < 2) return results;

  const rgPath = resolveRipgrepPath();
  if (!rgPath) {
    warn("ripgrep binary missing");
    return results;
  }

  const homeDir = os.homedir();
  const searchDirs = [path.join(homeDir, ".claude", "projects"), path.join(homeDir, ".codex", "sessions")].filter((d) =>
    fs.existsSync(d),
  );
  if (searchDirs.length === 0) return results;

  let output: string;
  try {
    output = execFileSync(
      rgPath,
      [
        "--fixed-strings",
        "--ignore-case",
        "--max-count",
        "1",
        "--max-filesize",
        "20M",
        "--glob",
        "*.jsonl",
        "--no-heading",
        "--with-filename",
        "--line-number",
        query,
        ...searchDirs,
      ],
      {
        encoding: "utf-8",
        maxBuffer: 16 * 1024 * 1024,
        timeout: 15000,
      },
    );
  } catch (err) {
    // ripgrep exits with code 1 when there are no matches — that's not an error.
    // Anything else (timeouts, OOM, ENOENT, code >= 2) IS an error and should be surfaced.
    const e = err as { status?: number; stderr?: Buffer; message?: string };
    if (e.status === 1) return results;
    warn(`ripgrep search failed (status=${e.status}):`, e.stderr?.toString() || e.message);
    return results;
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

  return results;
}
