import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDatabasePath } from "./paths";
import { sanitizeShortcutLabel, type Bookmark, type TagCount, type WorkflowyNodeRecord, type WorkflowyShortcut } from "./nodes";

let database: DatabaseSync | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  note TEXT,
  path TEXT NOT NULL DEFAULT '',
  parent_id TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_nodes_completed ON nodes(completed);
CREATE INDEX IF NOT EXISTS idx_nodes_updated_at ON nodes(updated_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  id UNINDEXED,
  name,
  note,
  content='nodes',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid, id, name, note) VALUES (new.rowid, new.id, new.name, COALESCE(new.note, ''));
END;
CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, id, name, note) VALUES('delete', old.rowid, old.id, old.name, COALESCE(old.note, ''));
END;
CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, id, name, note) VALUES('delete', old.rowid, old.id, old.name, COALESCE(old.note, ''));
  INSERT INTO nodes_fts(rowid, id, name, note) VALUES (new.rowid, new.id, new.name, COALESCE(new.note, ''));
END;

CREATE TABLE IF NOT EXISTS tags (
  tag TEXT NOT NULL,
  node_id TEXT NOT NULL,
  PRIMARY KEY (tag, node_id)
);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

CREATE TABLE IF NOT EXISTS wf_shortcuts (
  name TEXT PRIMARY KEY,
  node_id TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS bookmarks (
  name TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

function ensureParentDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function initializeDatabase(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA_SQL);
}

export function getDb(): DatabaseSync {
  if (database) return database;

  const dbPath = getDatabasePath();
  ensureParentDirectory(dbPath);

  database = new DatabaseSync(dbPath, { timeout: 5000 });
  initializeDatabase(database);
  return database;
}

export function closeDb(): void {
  if (!database) return;
  database.close();
  database = null;
}

function withTransaction(work: (db: DatabaseSync) => void): void {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    work(db);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM sync_meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string | number | null): void {
  getDb()
    .prepare("INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value == null ? null : String(value));
}

export function getLastSyncAt(): number | null {
  const value = getMeta("last_sync_at");
  return value ? Number(value) : null;
}

export function getLastExportAt(): number | null {
  const value = getMeta("last_export_at");
  return value ? Number(value) : null;
}

export function getCachedNodeCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM nodes").get() as { count: number };
  return row.count;
}

export function isCacheStale(staleMinutes: number): boolean {
  const lastSyncAt = getLastSyncAt();
  if (!lastSyncAt) return true;
  return Date.now() - lastSyncAt > staleMinutes * 60_000;
}

function mapNodeRow(row: Record<string, unknown>): WorkflowyNodeRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    note: row.note == null ? null : String(row.note),
    path: String(row.path ?? ""),
    parentId: row.parent_id == null ? null : String(row.parent_id),
    completed: Number(row.completed ?? 0),
    priority: Number(row.priority ?? 0),
    createdAt: row.created_at == null ? null : Number(row.created_at),
    updatedAt: row.updated_at == null ? null : Number(row.updated_at),
  };
}

function normalizeFtsQuery(input: string): string | null {
  const terms = input.match(/[#@]?[\p{L}\p{N}_-]+/gu) ?? [];
  if (terms.length === 0) return null;
  return terms.map((term) => `${term.replace(/"/g, "")}*`).join(" ");
}

export function listRecentNodes(limit = 50): WorkflowyNodeRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, note, path, parent_id, completed, priority, created_at, updated_at
       FROM nodes
       ORDER BY COALESCE(updated_at, created_at, 0) DESC, name COLLATE NOCASE ASC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(mapNodeRow);
}

function fallbackSearch(query: string, onlyIncomplete: boolean, limit: number): WorkflowyNodeRecord[] {
  const sql = `
    SELECT id, name, note, path, parent_id, completed, priority, created_at, updated_at
    FROM nodes
    WHERE (LOWER(name) LIKE ? OR LOWER(COALESCE(note, '')) LIKE ?)
      ${onlyIncomplete ? "AND completed = 0" : ""}
    ORDER BY COALESCE(updated_at, created_at, 0) DESC
    LIMIT ?
  `;
  const like = `%${query.toLowerCase()}%`;
  const rows = getDb().prepare(sql).all(like, like, limit) as Record<string, unknown>[];
  return rows.map(mapNodeRow);
}

export function searchNodes(query: string, limit = 50): WorkflowyNodeRecord[] {
  const trimmed = query.trim();
  if (!trimmed) return listRecentNodes(limit);

  const ftsQuery = normalizeFtsQuery(trimmed);
  if (!ftsQuery) return fallbackSearch(trimmed, false, limit);

  try {
    const rows = getDb()
      .prepare(
        `SELECT n.id, n.name, n.note, n.path, n.parent_id, n.completed, n.priority, n.created_at, n.updated_at
         FROM nodes_fts
         JOIN nodes n ON nodes_fts.id = n.id
         WHERE nodes_fts MATCH ?
         ORDER BY bm25(nodes_fts), COALESCE(n.updated_at, n.created_at, 0) DESC
         LIMIT ?`,
      )
      .all(ftsQuery, limit) as Record<string, unknown>[];
    return rows.map(mapNodeRow);
  } catch {
    return fallbackSearch(trimmed, false, limit);
  }
}

export function listIncompleteNodes(limit = 100): WorkflowyNodeRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, note, path, parent_id, completed, priority, created_at, updated_at
       FROM nodes
       WHERE completed = 0
       ORDER BY COALESCE(updated_at, created_at, 0) DESC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(mapNodeRow);
}

export function searchIncompleteNodes(query: string, limit = 100): WorkflowyNodeRecord[] {
  const trimmed = query.trim();
  if (!trimmed) return listIncompleteNodes(limit);

  const ftsQuery = normalizeFtsQuery(trimmed);
  if (!ftsQuery) return fallbackSearch(trimmed, true, limit);

  try {
    const rows = getDb()
      .prepare(
        `SELECT n.id, n.name, n.note, n.path, n.parent_id, n.completed, n.priority, n.created_at, n.updated_at
         FROM nodes_fts
         JOIN nodes n ON nodes_fts.id = n.id
         WHERE nodes_fts MATCH ?
           AND n.completed = 0
         ORDER BY bm25(nodes_fts), COALESCE(n.updated_at, n.created_at, 0) DESC
         LIMIT ?`,
      )
      .all(ftsQuery, limit) as Record<string, unknown>[];
    return rows.map(mapNodeRow);
  } catch {
    return fallbackSearch(trimmed, true, limit);
  }
}

export function getNodeById(id: string): WorkflowyNodeRecord | null {
  const row = getDb()
    .prepare(
      `SELECT id, name, note, path, parent_id, completed, priority, created_at, updated_at
       FROM nodes
       WHERE id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapNodeRow(row) : null;
}

export function getChildren(parentId: string, limit = 5): WorkflowyNodeRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, note, path, parent_id, completed, priority, created_at, updated_at
       FROM nodes
       WHERE parent_id = ?
       ORDER BY priority ASC, name COLLATE NOCASE ASC
       LIMIT ?`,
    )
    .all(parentId, limit) as Record<string, unknown>[];
  return rows.map(mapNodeRow);
}

export function getChildCount(parentId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM nodes WHERE parent_id = ?").get(parentId) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function getAllShortcuts(): WorkflowyShortcut[] {
  const rows = getDb()
    .prepare(
      `SELECT name, node_id, is_system, label
       FROM wf_shortcuts
       ORDER BY is_system DESC, label COLLATE NOCASE ASC, name COLLATE NOCASE ASC`,
    )
    .all() as Array<{ name: string; node_id: string | null; is_system: number; label: string }>;

  return rows.map((row) => ({
    name: row.name,
    nodeId: row.node_id,
    isSystem: Boolean(row.is_system),
    label: sanitizeShortcutLabel(row.label) || row.name,
  }));
}

export function getShortcutByName(name: string): WorkflowyShortcut | null {
  const row = getDb()
    .prepare("SELECT name, node_id, is_system, label FROM wf_shortcuts WHERE name = ?")
    .get(name) as { name: string; node_id: string | null; is_system: number; label: string } | undefined;

  if (!row) return null;
  return {
    name: row.name,
    nodeId: row.node_id,
    isSystem: Boolean(row.is_system),
    label: sanitizeShortcutLabel(row.label) || row.name,
  };
}

export function listBookmarks(): Bookmark[] {
  const rows = getDb()
    .prepare("SELECT name, node_id, note, created_at FROM bookmarks ORDER BY name COLLATE NOCASE ASC")
    .all() as Array<{ name: string; node_id: string; note: string | null; created_at: number }>;

  return rows.map((row) => ({
    name: row.name,
    nodeId: row.node_id,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export function saveBookmark(name: string, nodeId: string, note: string | null): void {
  const createdAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO bookmarks (name, node_id, note, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET node_id = excluded.node_id, note = excluded.note`,
    )
    .run(name.trim(), nodeId, note?.trim() || null, createdAt);
}

export function deleteBookmark(name: string): void {
  getDb().prepare("DELETE FROM bookmarks WHERE name = ?").run(name);
}

export function getTagCounts(): TagCount[] {
  const rows = getDb()
    .prepare(
      `SELECT tag, COUNT(*) as count
       FROM tags
       GROUP BY tag
       ORDER BY count DESC, tag COLLATE NOCASE ASC`,
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    tag: String(row.tag),
    count: Number(row.count ?? 0),
  }));
}

export function getNodesByTag(tag: string, limit = 100): WorkflowyNodeRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT n.id, n.name, n.note, n.path, n.parent_id, n.completed, n.priority, n.created_at, n.updated_at
       FROM tags t
       JOIN nodes n ON n.id = t.node_id
       WHERE t.tag = ?
       ORDER BY n.completed ASC,
                COALESCE(NULLIF(n.path, ''), n.name) COLLATE NOCASE ASC,
                n.priority ASC,
                COALESCE(n.updated_at, n.created_at, 0) DESC
       LIMIT ?`,
    )
    .all(tag.toLowerCase(), limit) as Record<string, unknown>[];
  return rows.map(mapNodeRow);
}

function buildNodePath(name: string, parentId: string | null): string {
  if (!parentId) return name;
  const parent = getNodeById(parentId);
  if (!parent) return name;
  return parent.path ? `${parent.path} > ${name}` : name;
}

function rebuildSubtreePaths(nodeId: string): void {
  const node = getNodeById(nodeId);
  if (!node) return;

  const nextPath = buildNodePath(node.name, node.parentId);
  getDb().prepare("UPDATE nodes SET path = ? WHERE id = ?").run(nextPath, nodeId);

  const children = getChildren(nodeId, Number.MAX_SAFE_INTEGER);
  for (const child of children) {
    rebuildSubtreePaths(child.id);
  }
}

export function insertNodeOptimistically(node: {
  id: string;
  name: string;
  note?: string | null;
  parentId: string | null;
  completed?: number;
  priority?: number;
  createdAt?: number | null;
  updatedAt?: number | null;
}): void {
  const pathValue = buildNodePath(node.name, node.parentId);
  getDb()
    .prepare(
      `INSERT INTO nodes (id, name, note, path, parent_id, completed, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         note = excluded.note,
         path = excluded.path,
         parent_id = excluded.parent_id,
         completed = excluded.completed,
         priority = excluded.priority,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
    )
    .run(
      node.id,
      node.name,
      node.note ?? null,
      pathValue,
      node.parentId,
      node.completed ?? 0,
      node.priority ?? 0,
      node.createdAt ?? Math.floor(Date.now() / 1000),
      node.updatedAt ?? Math.floor(Date.now() / 1000),
    );
}

export function updateNodeOptimistically(id: string, values: { name?: string; note?: string | null }): void {
  const existing = getNodeById(id);
  if (!existing) return;

  const nextName = values.name ?? existing.name;
  const nextNote = values.note === undefined ? existing.note : values.note;
  const nextPath = buildNodePath(nextName, existing.parentId);

  getDb()
    .prepare("UPDATE nodes SET name = ?, note = ?, path = ?, updated_at = ? WHERE id = ?")
    .run(nextName, nextNote, nextPath, Math.floor(Date.now() / 1000), id);

  rebuildSubtreePaths(id);
}

export function setNodeCompletedOptimistically(id: string, completed: boolean): void {
  getDb()
    .prepare("UPDATE nodes SET completed = ?, updated_at = ? WHERE id = ?")
    .run(completed ? Math.floor(Date.now() / 1000) : 0, Math.floor(Date.now() / 1000), id);
}

export function moveNodeOptimistically(id: string, parentId: string | null): void {
  const node = getNodeById(id);
  if (!node) return;
  const nextPath = buildNodePath(node.name, parentId);
  getDb()
    .prepare("UPDATE nodes SET parent_id = ?, path = ?, updated_at = ? WHERE id = ?")
    .run(parentId, nextPath, Math.floor(Date.now() / 1000), id);
  rebuildSubtreePaths(id);
}

export function deleteNodeOptimistically(id: string): void {
  const db = getDb();
  const descendantRows = db
    .prepare(
      `WITH RECURSIVE subtree(id) AS (
         SELECT id FROM nodes WHERE id = ?
         UNION ALL
         SELECT nodes.id FROM nodes JOIN subtree ON nodes.parent_id = subtree.id
       )
       SELECT id FROM subtree`,
    )
    .all(id) as Array<{ id: string }>;

  const nodeIds = descendantRows.map((row) => row.id);
  const deleteNode = db.prepare("DELETE FROM nodes WHERE id = ?");
  const deleteTags = db.prepare("DELETE FROM tags WHERE node_id = ?");

  withTransaction(() => {
    for (const nodeId of nodeIds) {
      deleteTags.run(nodeId);
      deleteNode.run(nodeId);
    }
  });
}
