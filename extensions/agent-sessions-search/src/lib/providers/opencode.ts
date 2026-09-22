import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { homeOf } from "../config";
import { safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder, columnsOf, dbSessionFile, openReadOnly, pick, splitDbSessionFile, tablesOf } from "./base";

/**
 * opencode: ~/.local/share/opencode/opencode.db (one database, not the pre-1.2 JSON tree).
 * Release channels get their own file, so every `opencode*.db` in the data directory is indexed.
 *
 *   session(id, title, directory, parent_id, time_created, time_updated, time_archived, …)
 *   message(id, session_id, data)          data = { role: "user" | "assistant", time: { created } }
 *   part(id, message_id, session_id, data) data = { type: "text", text } | { type: "tool", tool }
 *
 * Times are epoch milliseconds. Child sessions (sub-agents, task spawns) carry `parent_id`, which
 * is exactly how opencode's own list command hides them.
 *
 * Both message models can exist: the v1 `message`/`part` pair and the newer `session_message`
 * table with its parts inlined. Whichever is present is used.
 */

const DEFAULT_TITLE = /^(New session|Child session) - \d{4}-\d{2}-\d{2}T/;

interface OpencodeMessage {
  role?: string;
  time?: { created?: number };
  parts?: OpencodePart[];
}

interface OpencodePart {
  type?: string;
  text?: string;
  tool?: string;
  state?: { input?: unknown };
  synthetic?: boolean;
  ignored?: boolean;
}

function dataDir(): string {
  // opencode uses the XDG data directory on every platform, macOS included.
  return homeOf("opencode");
}

function databases(): string[] {
  const dir = dataDir();
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && /^opencode.*\.db$/.test(e.name))
      .map((e) => join(dir, e.name));
  } catch {
    return [];
  }
}

export const opencodeProvider: SessionProvider = {
  id: "opencode",

  async prepare() {},

  async discover(): Promise<DiscoveredFile[]> {
    const out: DiscoveredFile[] = [];
    for (const dbPath of databases()) {
      const db = openReadOnly(dbPath);
      if (!db) continue;
      try {
        if (!tablesOf(db).has("session")) continue;
        const cols = columnsOf(db, "session");
        const rows = db
          .prepare(
            `SELECT id, ${pick(cols, "time_updated")}, ${pick(cols, "time_created")} FROM session
             WHERE ${cols.has("parent_id") ? "parent_id IS NULL" : "1"}`,
          )
          .all() as { id: string; time_updated: number | null; time_created: number | null }[];
        for (const r of rows) {
          out.push({
            agent: "opencode",
            file: dbSessionFile(dbPath, r.id),
            size: 0,
            mtime: Math.floor(r.time_updated ?? r.time_created ?? 0),
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
    const b = new SessionBuilder("opencode", sessionId, file, previous);
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
  const cols = columnsOf(db, "session");
  const row = db
    .prepare(
      `SELECT ${pick(cols, "title")}, ${pick(cols, "directory")}, ${pick(cols, "time_created")},
              ${pick(cols, "time_updated")}, ${pick(cols, "time_archived")}, ${pick(cols, "agent")}
       FROM session WHERE id = ?`,
    )
    .get(sessionId) as Record<string, string | number | null> | undefined;
  if (row) {
    const title = row.title as string | null;
    // Until the model has named it, the title is a placeholder timestamp: prefer the first prompt.
    if (title && !DEFAULT_TITLE.test(title)) b.setTitle("session-title", title, 3);
    b.state.cwd = (row.directory as string | null) || null;
    if (row.agent) b.state.entrypoint = String(row.agent);
    if (row.time_archived) b.state.archived = true;
    b.touch(numberOrNull(row.time_created));
    b.touch(numberOrNull(row.time_updated));
  }

  const tables = tablesOf(db);
  if (tables.has("message")) {
    const messages = db
      .prepare(`SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created, id`)
      .all(sessionId) as { id: string; data: string }[];
    const partsFor = tables.has("part") ? db.prepare(`SELECT data FROM part WHERE message_id = ? ORDER BY id`) : null;
    for (const m of messages) {
      const msg = safeJson<OpencodeMessage>(m.data);
      if (!msg) continue;
      const parts = (partsFor?.all(m.id) as { data: string }[] | undefined) ?? [];
      addMessage(
        b,
        msg,
        parts.map((p) => safeJson<OpencodePart>(p.data)).filter((p): p is OpencodePart => !!p),
      );
    }
    return;
  }
  if (tables.has("session_message")) {
    const rows = db
      .prepare(`SELECT data FROM session_message WHERE session_id = ? ORDER BY seq, id`)
      .all(sessionId) as { data: string }[];
    for (const r of rows) {
      const msg = safeJson<OpencodeMessage>(r.data);
      if (msg) addMessage(b, msg, msg.parts ?? []);
    }
  }
}

function addMessage(b: SessionBuilder, msg: OpencodeMessage, parts: OpencodePart[]) {
  const role = msg.role === "user" ? "user" : msg.role === "assistant" ? "assistant" : null;
  if (!role) return;
  const ts = numberOrNull(msg.time?.created);
  const texts: string[] = [];
  for (const p of parts) {
    if (p.type === "text" && typeof p.text === "string" && !p.synthetic && !p.ignored) texts.push(p.text);
    else if (p.type === "tool" && typeof p.tool === "string") b.addTool(p.tool, p.state?.input, ts);
  }
  b.addMessage(role, texts.join("\n"), ts);
}

function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
