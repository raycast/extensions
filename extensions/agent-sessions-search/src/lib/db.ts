import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { getConfig } from "./config";
import { DatabaseSync } from "node:sqlite";
import { AgentId, IndexedMessage, RefEntry, SessionState } from "./types";

/**
 * Local SQLite index (node:sqlite, bundled with the Node 22 runtime Raycast ships).
 * FTS5 gives us BM25 ranking, phrase queries and snippets without native modules.
 */

const SCHEMA_VERSION = "3";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const path = getConfig().dbPath;
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA busy_timeout = 8000");
  db.exec("PRAGMA temp_store = MEMORY");
  ensureSchema(db);
  return db;
}

export function closeDb() {
  db?.close();
  db = null;
}

/** Delete the index files entirely (used by "Rebuild"). */
export function dropDb() {
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) rmSync(getConfig().dbPath + suffix, { force: true });
}

function ensureSchema(d: DatabaseSync) {
  d.exec(`CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = d.prepare(`SELECT value FROM meta WHERE key = 'schema'`).get() as { value: string } | undefined;
  if (row && row.value !== SCHEMA_VERSION) {
    d.exec(
      `DROP TABLE IF EXISTS messages_fts; DROP TABLE IF EXISTS messages; DROP TABLE IF EXISTS refs; DROP TABLE IF EXISTS sessions;`,
    );
  }
  d.exec(`
    CREATE TABLE IF NOT EXISTS sessions(
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      session_id TEXT NOT NULL,
      file TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      file_mtime INTEGER NOT NULL,
      indexed_bytes INTEGER NOT NULL DEFAULT 0,
      title TEXT,
      title_source TEXT,
      cwd TEXT,
      repo TEXT,
      repo_root TEXT,
      branch TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      message_count INTEGER NOT NULL DEFAULT 0,
      first_prompt TEXT,
      last_prompt TEXT,
      entrypoint TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS sessions_updated ON sessions(hidden, updated_at DESC);
    CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      ts INTEGER,
      text TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_session ON messages(session_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      text, content='messages', content_rowid='id', tokenize='unicode61'
    );
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, text) VALUES (new.id, new.text);
    END;
    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, text) VALUES ('delete', old.id, old.text);
    END;
    CREATE TABLE IF NOT EXISTS refs(
      session_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (session_id, kind, value, source)
    );
    CREATE INDEX IF NOT EXISTS refs_lookup ON refs(kind, value);
  `);
  d.prepare(`INSERT OR REPLACE INTO meta(key, value) VALUES ('schema', ?)`).run(SCHEMA_VERSION);
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare(`SELECT value FROM meta WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  getDb().prepare(`INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)`).run(key, value);
}

interface SessionRow {
  id: string;
  agent: AgentId;
  session_id: string;
  file: string;
  file_size: number;
  file_mtime: number;
  indexed_bytes: number;
  title: string | null;
  title_source: string | null;
  cwd: string | null;
  repo: string | null;
  repo_root: string | null;
  branch: string | null;
  created_at: number | null;
  updated_at: number | null;
  message_count: number;
  first_prompt: string | null;
  last_prompt: string | null;
  entrypoint: string | null;
  archived: number;
  hidden: number;
}

export function rowToState(r: SessionRow): SessionState {
  return {
    id: r.id,
    agent: r.agent,
    sessionId: r.session_id,
    file: r.file,
    fileSize: r.file_size,
    fileMtime: r.file_mtime,
    indexedBytes: r.indexed_bytes,
    title: r.title,
    titleSource: r.title_source,
    cwd: r.cwd,
    repo: r.repo,
    repoRoot: r.repo_root,
    branch: r.branch,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messageCount: r.message_count,
    firstPrompt: r.first_prompt,
    lastPrompt: r.last_prompt,
    entrypoint: r.entrypoint,
    archived: r.archived === 1,
    hidden: r.hidden === 1,
  };
}

export function loadAllStates(): Map<string, SessionState> {
  const rows = getDb().prepare(`SELECT * FROM sessions`).all() as unknown as SessionRow[];
  return new Map(rows.map((r) => [r.file, rowToState(r)]));
}

export function loadState(id: string): SessionState | null {
  const row = getDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as unknown as SessionRow | undefined;
  return row ? rowToState(row) : null;
}

export function loadRefs(sessionId: string): RefEntry[] {
  return getDb()
    .prepare(`SELECT kind, value, source, weight FROM refs WHERE session_id = ?`)
    .all(sessionId) as unknown as RefEntry[];
}

export function deleteSession(id: string) {
  const d = getDb();
  d.prepare(`DELETE FROM messages WHERE session_id = ?`).run(id);
  d.prepare(`DELETE FROM refs WHERE session_id = ?`).run(id);
  d.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}

export function deleteSessionByFile(file: string) {
  const row = getDb().prepare(`SELECT id FROM sessions WHERE file = ?`).get(file) as { id: string } | undefined;
  if (row) deleteSession(row.id);
}

/** Persist a parse result. `append` keeps existing messages; otherwise the session is replaced. */
export function writeSession(state: SessionState, messages: IndexedMessage[], refs: RefEntry[], append: boolean) {
  const d = getDb();
  d.exec("BEGIN");
  try {
    if (!append) {
      d.prepare(`DELETE FROM messages WHERE session_id = ?`).run(state.id);
    } else {
      d.prepare(`DELETE FROM messages WHERE session_id = ? AND role = 'meta'`).run(state.id);
    }
    d.prepare(`DELETE FROM refs WHERE session_id = ?`).run(state.id);
    d.prepare(
      `INSERT OR REPLACE INTO sessions(id, agent, session_id, file, file_size, file_mtime, indexed_bytes, title, title_source,
         cwd, repo, repo_root, branch, created_at, updated_at, message_count, first_prompt, last_prompt, entrypoint, archived, hidden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      state.id,
      state.agent,
      state.sessionId,
      state.file,
      state.fileSize,
      state.fileMtime,
      state.indexedBytes,
      state.title,
      state.titleSource,
      state.cwd,
      state.repo,
      state.repoRoot,
      state.branch,
      state.createdAt,
      state.updatedAt,
      state.messageCount,
      state.firstPrompt,
      state.lastPrompt,
      state.entrypoint,
      state.archived ? 1 : 0,
      state.hidden ? 1 : 0,
    );
    if (!state.hidden) {
      const insMsg = d.prepare(`INSERT INTO messages(session_id, role, ts, text) VALUES (?, ?, ?, ?)`);
      for (const m of messages) insMsg.run(state.id, m.role, m.ts, m.text);
      // A synthetic "meta" document makes title / branch / repo / cwd searchable and boostable.
      const metaText = [state.title, state.branch, state.repo, state.cwd].filter(Boolean).join("\n");
      if (metaText) insMsg.run(state.id, "meta", state.updatedAt, metaText);
      const insRef = d.prepare(
        `INSERT OR REPLACE INTO refs(session_id, kind, value, source, weight) VALUES (?, ?, ?, ?, ?)`,
      );
      for (const r of refs) insRef.run(state.id, r.kind, r.value, r.source, r.weight);
    }
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export function countSessions(): number {
  const row = getDb().prepare(`SELECT count(*) AS n FROM sessions WHERE hidden = 0`).get() as { n: number };
  return row.n;
}
