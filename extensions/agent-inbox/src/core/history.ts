import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { CACHE_DIR, CLAUDE_PROJECTS, CODEX_SESSION_INDEX, CODEX_SESSIONS } from "./paths";
import { lastSentence, toTitle } from "./status";
import { parseClaude, parseCodex, parseLines, readHeadTail, TranscriptInfo } from "./transcript";
import { HistoryEntry, Host } from "./types";
import { findClaudeDesktopSession, readClaudeDesktopSessions } from "./claude-desktop";

export interface TranscriptFile {
  agent: "claude" | "codex";
  path: string;
  mtime: number;
  size: number;
}

const CACHE_FILE = join(CACHE_DIR, "history.json");
const CACHE_VERSION = 3;

function listClaude(root: string): TranscriptFile[] {
  const out: TranscriptFile[] = [];
  if (!existsSync(root)) return out;
  for (const dir of safeReaddir(root)) {
    const d = join(root, dir);
    for (const f of safeReaddir(d)) {
      if (!f.endsWith(".jsonl")) continue;
      const p = join(d, f);
      const st = safeStat(p);
      if (st && st.isFile()) out.push({ agent: "claude", path: p, mtime: st.mtimeMs, size: st.size });
    }
  }
  return out;
}

function listCodex(root: string): TranscriptFile[] {
  const out: TranscriptFile[] = [];
  const walk = (d: string, depth: number) => {
    for (const f of safeReaddir(d)) {
      const p = join(d, f);
      const st = safeStat(p);
      if (!st) continue;
      if (st.isDirectory() && depth < 4) walk(p, depth + 1);
      else if (st.isFile() && f.endsWith(".jsonl")) out.push({ agent: "codex", path: p, mtime: st.mtimeMs, size: st.size });
    }
  };
  if (existsSync(root)) walk(root, 0);
  return out;
}

function safeReaddir(d: string): string[] {
  try {
    return readdirSync(d);
  } catch {
    return [];
  }
}

function safeStat(p: string) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/** Codex desktop keeps thread names in session_index.jsonl ({"id", "thread_name"}). */
function codexThreadNames(path: string): Map<string, string> {
  const names = new Map<string, string>();
  try {
    for (const e of parseLines(readFileSync(path, "utf8").split("\n"))) {
      const id = typeof e.id === "string" ? e.id : "";
      const name = typeof e.thread_name === "string" ? e.thread_name : "";
      if (id && name) names.set(id, name);
    }
  } catch {
    // optional file
  }
  return names;
}

const UUID_IN_NAME = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function hostFor(agent: "claude" | "codex", info: TranscriptInfo): Host {
  if (agent === "claude") return /desktop/i.test(info.entrypoint) ? "app" : "cli";
  // A Codex transcript alone does not prove which app wrote it; only a clear desktop originator counts.
  return /desktop|codex_app|chatgpt/i.test(info.originator) ? "app" : "cli";
}

function toEntry(ref: TranscriptFile, info: TranscriptInfo, names: Map<string, string>): HistoryEntry | null {
  let sessionId = info.sessionId;
  if (!sessionId) {
    sessionId = ref.agent === "claude" ? basename(ref.path, ".jsonl") : (basename(ref.path).match(UUID_IN_NAME)?.[1] ?? "");
  }
  if (!sessionId) return null;
  const title = names.get(sessionId) || toTitle(info.title) || toTitle(info.firstPrompt);
  return {
    agent: ref.agent,
    sessionId,
    host: hostFor(ref.agent, info),
    title,
    cwd: info.cwd,
    summary: lastSentence(info.lastAssistant),
    startedAt: info.startedAt || ref.mtime,
    updatedAt: Math.round(ref.mtime),
    transcriptPath: ref.path,
    ...(ref.agent === "claude" && info.entrypoint ? { locator: { claudeEntrypoint: info.entrypoint } } : {}),
  };
}

interface CacheShape {
  v: number;
  files: Record<string, { mtime: number; size: number; entry: HistoryEntry | null }>;
}

function loadCache(): CacheShape {
  try {
    const c = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as CacheShape;
    if (c.v === CACHE_VERSION) return c;
  } catch {
    // ignore
  }
  return { v: CACHE_VERSION, files: {} };
}

function saveCache(c: CacheShape) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(c));
  } catch {
    // cache is best effort
  }
}

export interface ScanOptions {
  limit?: number;
  /** Keep otherwise hidden metadata rows so full-content search can find dialogue outside head/tail windows. */
  includeUntitled?: boolean;
  claudeRoot?: string;
  codexRoot?: string;
  codexIndex?: string;
  useCache?: boolean;
  claudeDesktopRoot?: string;
}

/** File metadata only: content indexing and history discovery share the same supported sources. */
export function listTranscriptFiles(opts: Pick<ScanOptions, "claudeRoot" | "codexRoot"> = {}): TranscriptFile[] {
  return [...listClaude(opts.claudeRoot ?? CLAUDE_PROJECTS), ...listCodex(opts.codexRoot ?? CODEX_SESSIONS)].sort(
    (a, b) => b.mtime - a.mtime,
  );
}

/**
 * Scan transcripts on disk. Nothing is imported or copied: results are a view merged with the
 * hook database by the "All Sessions" command. Parsed results are cached by mtime+size.
 */
export function scanHistory(opts: ScanOptions = {}): HistoryEntry[] {
  const limit = opts.limit ?? 300;
  const files = listTranscriptFiles(opts).slice(0, limit);
  const names = codexThreadNames(opts.codexIndex ?? CODEX_SESSION_INDEX);
  const desktop = readClaudeDesktopSessions(opts.claudeDesktopRoot);
  const useCache = opts.useCache ?? true;
  const cache = useCache ? loadCache() : { v: CACHE_VERSION, files: {} };
  const nextCache: CacheShape = { v: CACHE_VERSION, files: {} };
  const out: HistoryEntry[] = [];

  for (const ref of files) {
    const hit = cache.files[ref.path];
    let entry: HistoryEntry | null;
    if (hit && hit.mtime === ref.mtime && hit.size === ref.size) {
      entry = hit.entry;
    } else {
      try {
        const { head, tail } = readHeadTail(ref.path);
        const info =
          ref.agent === "claude" ? parseClaude(parseLines(head), parseLines(tail)) : parseCodex(parseLines(head), parseLines(tail));
        entry = toEntry(ref, info, names);
      } catch {
        entry = null;
      }
    }
    if (entry && ref.agent === "codex" && names.has(entry.sessionId)) entry = { ...entry, title: names.get(entry.sessionId)! };
    nextCache.files[ref.path] = { mtime: ref.mtime, size: ref.size, entry };
    if (entry?.agent === "claude") {
      const record = findClaudeDesktopSession(entry.sessionId, desktop);
      if (record && !(entry.host === "cli" && entry.locator?.claudeEntrypoint))
        entry = {
          ...entry,
          host: "app",
          title: record.title || entry.title,
          cwd: entry.cwd || record.cwd,
          locator: { ...entry.locator, claudeDesktopId: record.sessionId },
        };
    }
    if (entry && (entry.title || opts.includeUntitled)) out.push(entry);
  }
  if (useCache) saveCache(nextCache);

  // A desktop session can have no readable local transcript yet. Its metadata still provides a precise jump target.
  const seenCli = new Set(out.filter((e) => e.agent === "claude").map((e) => e.sessionId));
  for (const r of desktop) {
    const id = r.cliSessionId || r.sessionId;
    if (!r.title || seenCli.has(id) || findClaudeDesktopSession(id, desktop) !== r) continue;
    out.push({
      agent: "claude",
      sessionId: id,
      host: "app",
      title: r.title,
      cwd: r.cwd,
      summary: "",
      startedAt: r.createdAt,
      updatedAt: r.lastActivityAt || r.createdAt,
      transcriptPath: "",
      locator: { claudeDesktopId: r.sessionId },
    });
    seenCli.add(id);
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);

  // One entry per session (Claude can split a session across files after /clear or resume).
  const seen = new Set<string>();
  return out
    .filter((e) => {
      const k = `${e.agent}:${e.sessionId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}
