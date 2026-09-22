import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { homeOf } from "../config";
import { safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder, columnsOf, dbSessionFile, openReadOnly, pick, splitDbSessionFile, tablesOf } from "./base";

/**
 * Crush keeps one database per project, at <project>/.crush/crush.db, so there is nothing global
 * to scan. Every launch registers the project in ~/.local/share/crush/projects.json
 * ([{ path, data_dir }]), which is the only reliable database → working directory mapping.
 *
 *   sessions(id, parent_session_id, title, created_at, updated_at, …)   epoch SECONDS
 *   messages(id, session_id, role, parts, created_at, …)
 *
 * `parts` is a JSON array of `{ type, data }` wrappers: `text` (`data.text`, skipped when
 * `hidden`) and `tool_call` (`data.name`). Sub-sessions — spawned tasks and the throwaway
 * sessions used to generate titles — all set `parent_session_id`, exactly as Crush's own list
 * query filters them out.
 */

const DEFAULT_TITLES = new Set(["New Session", "Untitled Session", "Generate a title"]);

interface CrushPart {
  type?: string;
  data?: { text?: string; hidden?: boolean; name?: string; input?: unknown };
}

interface Project {
  path?: string;
  data_dir?: string;
}

/** Registered project directory for each database, resolved once per index run. */
let projectCwds = new Map<string, string>();

function registryFile(): string {
  return join(homeOf("crush"), "projects.json");
}

function loadProjects(): { dbPath: string; cwd: string }[] {
  let raw: string;
  try {
    raw = readFileSync(registryFile(), "utf8");
  } catch {
    return [];
  }
  const parsed = safeJson<Project[] | { projects?: Project[] }>(raw);
  const list = Array.isArray(parsed) ? parsed : (parsed?.projects ?? []);
  const out: { dbPath: string; cwd: string }[] = [];
  for (const p of list) {
    if (!p?.path) continue;
    // `data_dir` is usually <project>/.crush but can be moved with --data-dir.
    const dataDir = p.data_dir || join(p.path, ".crush");
    out.push({ dbPath: join(dataDir, "crush.db"), cwd: p.path });
  }
  return out;
}

export const crushProvider: SessionProvider = {
  id: "crush",

  async prepare() {
    projectCwds = new Map(loadProjects().map((p) => [p.dbPath, p.cwd]));
  },

  async discover(): Promise<DiscoveredFile[]> {
    const out: DiscoveredFile[] = [];
    for (const dbPath of projectCwds.keys()) {
      const db = openReadOnly(dbPath);
      if (!db) continue;
      try {
        if (!tablesOf(db).has("sessions")) continue;
        const cols = columnsOf(db, "sessions");
        const where = cols.has("parent_session_id") ? "parent_session_id IS NULL" : "1";
        const rows = db
          .prepare(`SELECT id, ${pick(cols, "updated_at")}, ${pick(cols, "created_at")} FROM sessions WHERE ${where}`)
          .all() as { id: string; updated_at: number | null; created_at: number | null }[];
        for (const r of rows) {
          out.push({
            agent: "crush",
            file: dbSessionFile(dbPath, r.id),
            size: 0,
            mtime: toMillis(r.updated_at ?? r.created_at) ?? 0,
          });
        }
      } finally {
        db.close();
      }
    }
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const { dbPath, sessionId } = splitDbSessionFile(file.file);
    const b = new SessionBuilder("crush", sessionId, file, previous);
    b.state.entrypoint = "cli";
    // The project directory is not stored in the database; it is the registered path, or the
    // directory holding `.crush/`.
    b.state.cwd = projectCwds.get(dbPath) ?? dirname(dirname(dbPath));
    const db = openReadOnly(dbPath);
    if (!db) return b.finish(file, ctx);
    try {
      readSession(db, sessionId, b);
    } finally {
      db.close();
    }
    return b.finish(file, ctx);
  },
};

function readSession(db: DatabaseSync, sessionId: string, b: SessionBuilder) {
  const cols = columnsOf(db, "sessions");
  const row = db
    .prepare(
      `SELECT ${pick(cols, "title")}, ${pick(cols, "created_at")}, ${pick(cols, "updated_at")}
              FROM sessions WHERE id = ?`,
    )
    .get(sessionId) as Record<string, string | number | null> | undefined;
  if (row) {
    const title = row.title as string | null;
    if (title && !DEFAULT_TITLES.has(title)) b.setTitle("session-title", title, 3);
    b.touch(toMillis(row.created_at));
    b.touch(toMillis(row.updated_at));
  }

  if (!tablesOf(db).has("messages")) return;
  const mcols = columnsOf(db, "messages");
  const rows = db
    .prepare(
      `SELECT role, ${pick(mcols, "parts")}, ${pick(mcols, "created_at")}
       FROM messages WHERE session_id = ? ORDER BY ${mcols.has("created_at") ? "created_at, " : ""}id`,
    )
    .all(sessionId) as { role: string; parts: string | null; created_at: number | null }[];
  for (const m of rows) {
    // `system` and `tool` rows are model plumbing rather than conversation.
    const role = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : null;
    if (!role) continue;
    const ts = toMillis(m.created_at);
    const parts = safeJson<CrushPart[]>(m.parts ?? "");
    const texts: string[] = [];
    for (const part of Array.isArray(parts) ? parts : []) {
      if (part?.type === "text" && typeof part.data?.text === "string" && !part.data.hidden) {
        texts.push(part.data.text);
      } else if (part?.type === "tool_call" && typeof part.data?.name === "string") {
        b.addTool(part.data.name, part.data.input, ts);
      }
    }
    b.addMessage(role, texts.join("\n"), ts);
  }
}

/** Crush stores Unix seconds, unlike every other agent here. */
function toMillis(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value * 1000);
}
