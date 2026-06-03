#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const API_BASE = "https://workflowy.com";
const RATE_LIMIT_MS = 60_000;
const SYSTEM_TARGETS = ["inbox", "today", "tomorrow", "next_week"];

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

function emit(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function parseArgs(argv) {
  let dbPath = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--db") {
      dbPath = argv[index + 1] || null;
      index += 1;
    }
  }

  return { dbPath };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function initializeDatabase(db) {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA_SQL);
}

function withTransaction(db, work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    work();
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

function getMeta(db, key) {
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setMeta(db, key, value) {
  db.prepare(
    "INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value == null ? null : String(value));
}

function toLabel(value) {
  return value
    .split(/[_-]/g)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function sanitizeShortcutLabel(value) {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeShortcut(value) {
  if (!value || typeof value !== "object") return null;
  const target = value;
  const key = String(target.key ?? target.name ?? target.shortcut ?? target.target ?? "").trim();
  if (!key) return null;

  const maybeId = [target.node_id, target.nodeId, target.id, target.uuid].find((candidate) => typeof candidate === "string");
  const nodeId = typeof maybeId === "string" && /^[0-9a-f-]{36}$/i.test(maybeId) ? maybeId : null;
  const isSystem = String(target.type ?? "").toLowerCase() === "system" || Boolean(target.is_system ?? target.isSystem) || SYSTEM_TARGETS.includes(key.toLowerCase());
  const rawLabel = String(target.label ?? target.title ?? target.display_name ?? target.displayName ?? target.name ?? toLabel(key));
  const label = sanitizeShortcutLabel(rawLabel) || toLabel(key);

  return { name: key, nodeId, isSystem, label };
}

async function fetchJson(url, apiKey, errorPrefix) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${errorPrefix} (${response.status}): ${message || response.statusText}`);
  }

  return response.json();
}

async function fetchNodesExport(apiKey) {
  const response = await fetchJson(`${API_BASE}/api/v1/nodes-export`, apiKey, "Workflowy export failed");
  if (Array.isArray(response.nodes)) {
    return { format: "flat", nodes: response.nodes };
  }
  if (Array.isArray(response.items)) {
    return { format: "tree", nodes: response.items };
  }
  return { format: "unknown", nodes: [] };
}

async function fetchTargets(apiKey) {
  const response = await fetchJson(`${API_BASE}/api/v1/targets`, apiKey, "Loading Workflowy targets failed");
  const values = Array.isArray(response?.targets) ? response.targets : [];
  const targets = values.map(normalizeShortcut).filter(Boolean);
  const names = new Set(targets.map((target) => target.name));

  for (const systemName of SYSTEM_TARGETS) {
    if (!names.has(systemName)) {
      targets.unshift({ name: systemName, nodeId: null, isSystem: true, label: toLabel(systemName) });
    }
  }

  targets.sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return targets;
}

function extractTags(value) {
  const matches = String(value || "").match(/#[\w-]+|@[\w-]+/g) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

function flattenTreeExport(items) {
  const nodes = [];
  const tagPairs = [];

  function visit(node, parentId, ancestors) {
    if (!node || !node.id) return;

    const name = typeof node.nm === "string" ? node.nm : "";
    const note = typeof node.no === "string" ? node.no : null;
    const pathParts = [...ancestors, name].filter(Boolean);
    const pathValue = pathParts.join(" > ");

    nodes.push({
      id: node.id,
      name,
      note,
      path: pathValue,
      parentId: parentId || null,
      completed: typeof node.cp === "number" ? node.cp : 0,
      priority: typeof node.pr === "number" ? node.pr : 0,
      createdAt: typeof node.ct === "number" ? node.ct : null,
      updatedAt: typeof node.lm === "number" ? node.lm : null,
    });

    const tags = extractTags(`${name}\n${note || ""}`);
    for (const tag of tags) {
      tagPairs.push({ tag, nodeId: node.id });
    }

    if (Array.isArray(node.ch)) {
      for (const child of node.ch) {
        visit(child, node.id, pathParts);
      }
    }
  }

  for (const item of items) {
    visit(item, null, []);
  }

  return { nodes, tagPairs };
}

function flattenFlatExport(items) {
  const byId = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object" || !item.id) continue;
    byId.set(item.id, item);
  }

  const pathCache = new Map();
  const visiting = new Set();

  function buildPath(node) {
    if (!node || !node.id) return "";
    if (pathCache.has(node.id)) return pathCache.get(node.id);
    if (visiting.has(node.id)) return String(node.name ?? "");

    visiting.add(node.id);
    const name = typeof node.name === "string" ? node.name : "";
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    const parentPath = parent ? buildPath(parent) : "";
    const result = parentPath && name ? `${parentPath} > ${name}` : name || parentPath;
    pathCache.set(node.id, result);
    visiting.delete(node.id);
    return result;
  }

  const nodes = [];
  const tagPairs = [];

  for (const item of items) {
    if (!item || typeof item !== "object" || !item.id) continue;
    const name = typeof item.name === "string" ? item.name : "";
    const note = typeof item.note === "string" ? item.note : null;

    nodes.push({
      id: item.id,
      name,
      note,
      path: buildPath(item),
      parentId: typeof item.parent_id === "string" ? item.parent_id : null,
      completed:
        typeof item.completedAt === "number"
          ? item.completedAt
          : typeof item.completed_at === "number"
            ? item.completed_at
            : item.completed
              ? Math.floor(Date.now() / 1000)
              : 0,
      priority: typeof item.priority === "number" ? item.priority : 0,
      createdAt:
        typeof item.createdAt === "number"
          ? item.createdAt
          : typeof item.created_at === "number"
            ? item.created_at
            : null,
      updatedAt:
        typeof item.modifiedAt === "number"
          ? item.modifiedAt
          : typeof item.updated_at === "number"
            ? item.updated_at
            : null,
    });

    const tags = extractTags(`${name}\n${note || ""}`);
    for (const tag of tags) {
      tagPairs.push({ tag, nodeId: item.id });
    }
  }

  return { nodes, tagPairs };
}

function flattenNodes(exportPayload) {
  if (exportPayload.format === "flat") {
    return flattenFlatExport(exportPayload.nodes);
  }
  return flattenTreeExport(exportPayload.nodes);
}

function replaceCache(db, nodes, tagPairs, shortcuts) {
  withTransaction(db, () => {
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM wf_shortcuts").run();
    db.prepare("DELETE FROM nodes").run();

    const insertNode = db.prepare(
      `INSERT INTO nodes (id, name, note, path, parent_id, completed, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const node of nodes) {
      insertNode.run(
        node.id,
        node.name,
        node.note,
        node.path,
        node.parentId,
        node.completed,
        node.priority,
        node.createdAt,
        node.updatedAt,
      );
    }

    const insertTag = db.prepare("INSERT OR IGNORE INTO tags (tag, node_id) VALUES (?, ?)");
    for (const pair of tagPairs) {
      insertTag.run(pair.tag, pair.nodeId);
    }

    const insertShortcut = db.prepare(
      "INSERT INTO wf_shortcuts (name, node_id, is_system, label) VALUES (?, ?, ?, ?)",
    );
    for (const shortcut of shortcuts) {
      insertShortcut.run(shortcut.name, shortcut.nodeId, shortcut.isSystem ? 1 : 0, shortcut.label);
    }

    const now = Date.now();
    setMeta(db, "last_sync_at", now);
    setMeta(db, "last_export_at", now);
    setMeta(db, "node_count", nodes.length);
  });
}

async function main() {
  const { dbPath } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.WORKFLOWY_API_KEY;

  if (!apiKey) {
    emit({ type: "error", message: "Missing Workflowy API key." });
    process.exit(1);
    return;
  }

  if (!dbPath) {
    emit({ type: "error", message: "Missing database path." });
    process.exit(1);
    return;
  }

  ensureDir(dbPath);
  const db = new DatabaseSync(dbPath, { timeout: 5000 });
  initializeDatabase(db);

  const lastExportAt = Number(getMeta(db, "last_export_at") || 0);
  const now = Date.now();
  const remainingMs = lastExportAt ? RATE_LIMIT_MS - (now - lastExportAt) : 0;
  if (remainingMs > 0) {
    emit({
      type: "rate-limit",
      message: `Rate limit — wait ${Math.ceil(remainingMs / 1000)}s`,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    });
    db.close();
    process.exit(0);
    return;
  }

  emit({ type: "progress", step: "export", message: "Downloading Workflowy account…" });
  const items = await fetchNodesExport(apiKey);

  emit({ type: "progress", step: "flatten", message: "Flattening nodes and extracting tags…" });
  const { nodes, tagPairs } = flattenNodes(items);

  emit({ type: "progress", step: "targets", message: "Loading Workflowy shortcuts…" });
  const shortcuts = await fetchTargets(apiKey);

  emit({ type: "progress", step: "cache", message: "Updating local cache…" });
  replaceCache(db, nodes, tagPairs, shortcuts);

  emit({ type: "done", nodeCount: nodes.length, message: `Synced ${nodes.length} nodes` });
  db.close();
}

main().catch((error) => {
  emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
