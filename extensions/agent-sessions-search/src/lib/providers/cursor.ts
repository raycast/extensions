import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { homeOf } from "../config";
import { readJsonlLines, safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder } from "./base";

/**
 * Cursor: ~/.cursor/projects/<slug>/agent-transcripts/<sessionId>/<sessionId>.jsonl
 *
 * The transcript is Anthropic-shaped and carries nothing else — no metadata line, no timestamps,
 * no tool results, no working directory:
 *   { role: "user" | "assistant", message: { content: [{ type: "text" | "tool_use", ... }] } }
 *   { type: "turn_ended", status: "success" | "error" }
 *
 * Everything else comes from the Cursor IDE's own key/value store, where each session has a
 * `composerData:<sessionId>` row (the transcript uuid is the IDE's composerId) holding the title,
 * the real timestamps, the workspace path, the git branch and the model. It is read read-only,
 * with `json_extract` so the large blobs never reach this process, and its absence is not fatal:
 * user turns embed a human-readable `<timestamp>`, Shell tool calls carry a `working_directory`,
 * and the filesystem supplies the rest.
 *
 * The project directory slug is never decoded: Cursor maps every non-alphanumeric character to
 * `-` and collapses runs, which is lossy (two different paths can produce one slug).
 *
 * Sub-agent transcripts live in a `subagents/` directory beside the session file, so listing only
 * `<sessionId>/<sessionId>.jsonl` excludes them.
 */

interface CursorLine {
  role?: string;
  message?: { content?: unknown };
}

interface CursorBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface ComposerMeta {
  title: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  cwd: string | null;
  branch: string | null;
  backend: string | null;
}

const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const TIMESTAMP_RE =
  /<timestamp>[^,<]*,\s*([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*\(UTC([+-]\d{1,2})(?::(\d{2}))?\)/i;

/** Parse `<timestamp>Tuesday, Sep 15, 2026, 4:17 PM (UTC+2)</timestamp>` into epoch ms. */
function parseCursorTimestamp(text: string): number | null {
  const m = TIMESTAMP_RE.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
  if (month === -1) return null;
  let hour = Number(m[4]) % 12;
  if (m[6].toUpperCase() === "PM") hour += 12;
  const offset = Number(m[7]);
  const iso =
    `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}` +
    `T${String(hour).padStart(2, "0")}:${m[5]}:00` +
    `${offset < 0 ? "-" : "+"}${String(Math.abs(offset)).padStart(2, "0")}:${m[8] ?? "00"}`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function cursorStateDb(): string {
  return join(homedir(), "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
}

let composers = new Map<string, ComposerMeta>();

function loadComposerMeta() {
  composers = new Map();
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(cursorStateDb(), { readOnly: true });
  } catch {
    return; // Cursor not installed, or the store is locked: transcripts still index fine.
  }
  try {
    // A key range rather than LIKE so the primary key index is used, and json_extract so the
    // (often huge) composer blobs are never materialised in JS.
    const rows = db
      .prepare(
        `SELECT key,
           json_extract(value,'$.name') AS name,
           json_extract(value,'$.createdAt') AS createdAt,
           json_extract(value,'$.lastUpdatedAt') AS lastUpdatedAt,
           json_extract(value,'$.workspaceIdentifier.uri.fsPath') AS fsPath,
           json_extract(value,'$.trackedGitRepos[0].repoPath') AS repoPath,
           json_extract(value,'$.trackedGitRepos[0].branches[0].branchName') AS branch,
           json_extract(value,'$.agentBackend') AS backend
         FROM cursorDiskKV WHERE key >= 'composerData:' AND key < 'composerData;'`,
      )
      .all() as Record<string, string | number | null>[];
    for (const r of rows) {
      const id = String(r.key).slice("composerData:".length);
      composers.set(id, {
        title: (r.name as string | null) || null,
        createdAt: numberOrNull(r.createdAt),
        updatedAt: numberOrNull(r.lastUpdatedAt),
        cwd: (r.fsPath as string | null) || (r.repoPath as string | null) || null,
        branch: (r.branch as string | null) || null,
        backend: (r.backend as string | null) || null,
      });
    }
  } catch {
    // Schema drift or a busy database: fall back to what the transcripts themselves say.
  } finally {
    db.close();
  }
}

function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

function blocks(content: unknown): CursorBlock[] {
  return Array.isArray(content) ? (content as CursorBlock[]) : [];
}

/**
 * Shell calls record an absolute `working_directory`, but a handful of them point at $HOME or at
 * Cursor's own scratch directories, so the most frequently seen plausible value wins.
 */
function modalCwd(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  const home = homedir();
  for (const [dir, n] of counts) {
    if (dir === home || dir.includes("/.cursor/")) continue;
    if (n > bestCount) {
      best = dir;
      bestCount = n;
    }
  }
  return best;
}

export const cursorProvider: SessionProvider = {
  id: "cursor",

  async prepare() {
    loadComposerMeta();
  },

  async discover(): Promise<DiscoveredFile[]> {
    const projects = join(homeOf("cursor"), "projects");
    const out: DiscoveredFile[] = [];
    let slugs: string[] = [];
    try {
      slugs = readdirSync(projects, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => e.name);
    } catch {
      return out;
    }
    for (const slug of slugs) {
      const root = join(projects, slug, "agent-transcripts");
      let sessions;
      try {
        sessions = readdirSync(root, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const s of sessions) {
        // One directory per session, holding <sessionId>.jsonl and a subagents/ directory.
        if (!s.isDirectory()) continue;
        const file = join(root, s.name, `${s.name}.jsonl`);
        try {
          const st = statSync(file);
          if (st.size === 0) continue;
          out.push({ agent: "cursor", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
        } catch {
          // no transcript yet, or a race with deletion
        }
      }
    }
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const sessionId = basename(file.file, ".jsonl");
    const meta = composers.get(sessionId);
    const b = new SessionBuilder("cursor", sessionId, file, previous);
    b.state.entrypoint = meta?.backend ?? "cursor";
    b.state.branch = meta?.branch ?? null;
    b.setTitle("composer-name", meta?.title, 3);

    const cwdCounts = new Map<string, number>();
    // Assistant turns carry no time of their own: they inherit the last user turn's.
    let ts: number | null = null;
    let firstTs: number | null = null;
    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson<CursorLine>(line.text);
      if (!rec) continue;
      const role = rec.role === "user" ? "user" : rec.role === "assistant" ? "assistant" : null;
      if (!role) continue; // turn_ended markers
      const texts: string[] = [];
      for (const block of blocks(rec.message?.content)) {
        if (!block || typeof block !== "object") continue;
        if (block.type === "text" && typeof block.text === "string") {
          texts.push(block.text);
          if (role === "user") {
            const at = parseCursorTimestamp(block.text);
            if (at) {
              ts = at;
              if (firstTs === null) firstTs = at;
            }
          }
        } else if (block.type === "tool_use" && typeof block.name === "string") {
          b.addTool(block.name, block.input, ts);
          const dir = (block.input as { working_directory?: unknown } | undefined)?.working_directory;
          if (typeof dir === "string" && dir.startsWith("/")) cwdCounts.set(dir, (cwdCounts.get(dir) ?? 0) + 1);
        }
      }
      b.addMessage(role, texts.join("\n"), ts);
    }

    // The IDE's own timestamps win; otherwise the first prompt's stated time, then the transcript
    // directory's creation time. The last write is always at least the file's mtime.
    let createdAt = meta?.createdAt ?? firstTs;
    if (createdAt === null || createdAt === undefined) {
      try {
        const born = Math.floor(statSync(dirname(file.file)).birthtimeMs);
        if (born > 0) createdAt = born;
      } catch {
        // directory vanished
      }
    }
    b.state.updatedAt = Math.max(file.mtime, meta?.updatedAt ?? 0);
    b.state.createdAt = createdAt && createdAt <= b.state.updatedAt ? createdAt : b.state.updatedAt;
    // The slug is lossy and is never decoded back into a path.
    b.state.cwd = meta?.cwd ?? modalCwd(cwdCounts);

    return b.finish(file, ctx);
  },
};
