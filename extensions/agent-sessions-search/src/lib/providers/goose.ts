import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { homeOf } from "../config";
import { safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder, columnsOf, dbSessionFile, openReadOnly, pick, splitDbSessionFile, tablesOf } from "./base";

/**
 * Goose: ~/.local/share/goose/sessions/sessions.db — one global database, no per-project files.
 * (Releases before 1.10 wrote one .jsonl per session into the same directory; those files are
 * left behind after their import into the database, so indexing them would double-count.)
 *
 *   sessions(id, name, description, working_dir, session_type, parent_session_id,
 *            created_at, updated_at, archived_at, …)   timestamps: "YYYY-MM-DD HH:MM:SS" UTC
 *   messages(session_id, role, content_json, created_timestamp)   timestamp: epoch seconds
 *
 * `content_json` is an array of internally tagged blocks; the ones worth indexing are `text` and
 * `toolRequest`, whose tool name sits at `toolCall.value.name`.
 *
 * `session_type` separates real sessions from machinery: `sub_agent` and `hidden` are excluded.
 */

const HIDDEN_TYPES = new Set(["sub_agent", "hidden"]);
/** Goose writes seconds but tolerates milliseconds; the same threshold it uses tells them apart. */
const MILLISECOND_THRESHOLD = 10_000_000_000;

interface GooseBlock {
  type?: string;
  text?: string;
  toolCall?: { value?: { name?: string; arguments?: unknown } };
}

function databasePath(): string {
  return join(homeOf("goose"), "sessions", "sessions.db");
}

/** SQLite `datetime('now')` output is UTC without a zone marker. */
function parseSqlTime(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const t = Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(t) ? null : t;
}

function parseEpoch(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value > MILLISECOND_THRESHOLD ? value : value * 1000;
}

export const gooseProvider: SessionProvider = {
  id: "goose",

  async prepare() {},

  async discover(): Promise<DiscoveredFile[]> {
    const dbPath = databasePath();
    const db = openReadOnly(dbPath);
    if (!db) return [];
    try {
      if (!tablesOf(db).has("sessions")) return [];
      const cols = columnsOf(db, "sessions");
      const where = cols.has("session_type")
        ? `session_type IS NULL OR session_type NOT IN ('sub_agent', 'hidden')`
        : "1";
      const rows = db
        .prepare(`SELECT id, ${pick(cols, "updated_at")}, ${pick(cols, "created_at")} FROM sessions WHERE ${where}`)
        .all() as Record<string, string | null>[];
      return rows.map((r) => ({
        agent: "goose" as const,
        file: dbSessionFile(dbPath, String(r.id)),
        size: 0,
        mtime: parseSqlTime(r.updated_at) ?? parseSqlTime(r.created_at) ?? 0,
      }));
    } finally {
      db.close();
    }
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const { dbPath, sessionId } = splitDbSessionFile(file.file);
    const b = new SessionBuilder("goose", sessionId, file, previous);
    b.state.entrypoint = "cli";
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
      `SELECT ${pick(cols, "name")}, ${pick(cols, "description")}, ${pick(cols, "working_dir")},
              ${pick(cols, "session_type")}, ${pick(cols, "created_at")}, ${pick(cols, "updated_at")},
              ${pick(cols, "archived_at")}
       FROM sessions WHERE id = ?`,
    )
    .get(sessionId) as Record<string, string | null> | undefined;
  if (row) {
    b.setTitle("session-name", row.name || row.description, 3);
    b.state.cwd = row.working_dir || null;
    if (row.archived_at) b.state.archived = true;
    if (row.session_type && HIDDEN_TYPES.has(row.session_type)) b.state.hidden = true;
    b.touch(parseSqlTime(row.created_at));
    b.touch(parseSqlTime(row.updated_at));
    if (b.state.hidden) return;
  }

  if (!tablesOf(db).has("messages")) return;
  const mcols = columnsOf(db, "messages");
  const rows = db
    .prepare(
      `SELECT role, ${pick(mcols, "content_json")}, ${pick(mcols, "created_timestamp")}
       FROM messages WHERE session_id = ? ORDER BY ${mcols.has("created_timestamp") ? "created_timestamp, " : ""}id`,
    )
    .all(sessionId) as { role: string; content_json: string | null; created_timestamp: number | null }[];
  for (const m of rows) {
    const role = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : null;
    if (!role) continue;
    const ts = parseEpoch(m.created_timestamp);
    const blocks = safeJson<GooseBlock[]>(m.content_json ?? "");
    const texts: string[] = [];
    for (const block of Array.isArray(blocks) ? blocks : []) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
      else if (block.type === "toolRequest") {
        const call = block.toolCall?.value;
        if (call?.name) b.addTool(call.name, call.arguments, ts);
      }
    }
    b.addMessage(role, texts.join("\n"), ts);
  }
}
