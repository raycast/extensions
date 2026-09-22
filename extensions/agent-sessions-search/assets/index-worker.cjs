"use strict";

// src/lib/db.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// src/lib/config.ts
var import_node_os = require("node:os");
var current = null;
function setConfig(cfg) {
  current = cfg;
}
function getConfig() {
  if (!current) throw new Error("Index configuration not initialised");
  return current;
}
function homeOf(id) {
  return getConfig().homes[id] ?? "";
}

// src/lib/db.ts
var import_node_sqlite = require("node:sqlite");
var SCHEMA_VERSION = "3";
var db = null;
function getDb() {
  if (db) return db;
  const path = getConfig().dbPath;
  (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)(path), { recursive: true });
  db = new import_node_sqlite.DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA busy_timeout = 8000");
  db.exec("PRAGMA temp_store = MEMORY");
  ensureSchema(db);
  return db;
}
function closeDb() {
  db?.close();
  db = null;
}
function dropDb() {
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) (0, import_node_fs.rmSync)(getConfig().dbPath + suffix, { force: true });
}
function ensureSchema(d) {
  d.exec(`CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = d.prepare(`SELECT value FROM meta WHERE key = 'schema'`).get();
  if (row && row.value !== SCHEMA_VERSION) {
    d.exec(
      `DROP TABLE IF EXISTS messages_fts; DROP TABLE IF EXISTS messages; DROP TABLE IF EXISTS refs; DROP TABLE IF EXISTS sessions;`
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
function getMeta(key) {
  const row = getDb().prepare(`SELECT value FROM meta WHERE key = ?`).get(key);
  return row?.value ?? null;
}
function setMeta(key, value) {
  getDb().prepare(`INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)`).run(key, value);
}
var LOCK_TTL_MS = 3 * 60 * 1e3;
function acquireLock() {
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const r = getDb().prepare(
    `INSERT INTO meta(key, value) VALUES ('lock', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value
       WHERE CAST(meta.value AS INTEGER) < ?`
  ).run(`${now}:${token}`, now - LOCK_TTL_MS);
  return r.changes > 0 ? token : null;
}
function isLocked() {
  const v = getMeta("lock");
  return !!v && Date.now() - parseInt(v, 10) < LOCK_TTL_MS;
}
function heartbeatLock(token) {
  getDb().prepare(`UPDATE meta SET value = ? WHERE key = 'lock' AND value LIKE ?`).run(`${Date.now()}:${token}`, `%:${token}`);
}
function releaseLock(token) {
  getDb().prepare(`DELETE FROM meta WHERE key = 'lock' AND value LIKE ?`).run(`%:${token}`);
}
function rowToState(r) {
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
    hidden: r.hidden === 1
  };
}
function loadAllStates() {
  const rows = getDb().prepare(`SELECT * FROM sessions`).all();
  return new Map(rows.map((r) => [r.file, rowToState(r)]));
}
function loadRefs(sessionId) {
  return getDb().prepare(`SELECT kind, value, source, weight FROM refs WHERE session_id = ?`).all(sessionId);
}
function deleteSession(id) {
  const d = getDb();
  d.prepare(`DELETE FROM messages WHERE session_id = ?`).run(id);
  d.prepare(`DELETE FROM refs WHERE session_id = ?`).run(id);
  d.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}
function deleteSessionByFile(file) {
  const row = getDb().prepare(`SELECT id FROM sessions WHERE file = ?`).get(file);
  if (row) deleteSession(row.id);
}
function writeSession(state, messages, refs, append) {
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      state.hidden ? 1 : 0
    );
    if (!state.hidden) {
      const insMsg = d.prepare(`INSERT INTO messages(session_id, role, ts, text) VALUES (?, ?, ?, ?)`);
      for (const m of messages) insMsg.run(state.id, m.role, m.ts, m.text);
      const metaText = [state.title, state.branch, state.repo, state.cwd].filter(Boolean).join("\n");
      if (metaText) insMsg.run(state.id, "meta", state.updatedAt, metaText);
      const insRef = d.prepare(
        `INSERT OR REPLACE INTO refs(session_id, kind, value, source, weight) VALUES (?, ?, ?, ?, ?)`
      );
      for (const r of refs) insRef.run(state.id, r.kind, r.value, r.source, r.weight);
    }
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

// src/lib/git.ts
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var cache = /* @__PURE__ */ new Map();
function parseRemoteUrl(url) {
  if (!url) return null;
  const m = url.trim().match(/[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}
function readOriginFromConfig(configPath) {
  try {
    const text = (0, import_node_fs2.readFileSync)(configPath, "utf8");
    const section = text.match(/\[remote "origin"\][^[]*/);
    const url = section?.[0].match(/^\s*url\s*=\s*(.+)$/m)?.[1];
    return parseRemoteUrl(url) ?? null;
  } catch {
    return null;
  }
}
function findGitEntry(start) {
  let dir = (0, import_node_path2.resolve)(start);
  for (let i = 0; i < 40; i++) {
    const gitPath = (0, import_node_path2.join)(dir, ".git");
    if ((0, import_node_fs2.existsSync)(gitPath)) return { root: dir, gitPath };
    const parent = (0, import_node_path2.dirname)(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}
function guessProjectDirFromPath(cwd) {
  return cwd.replace(/\/(\.claude\/worktrees|\.worktrees|\.codex\/worktrees|worktrees)\/[^/]+.*$/, "");
}
function resolveRepo(cwd) {
  if (!cwd) return { repo: null, repoRoot: null };
  const hit = cache.get(cwd);
  if (hit) return hit;
  let result = { repo: null, repoRoot: null };
  try {
    if ((0, import_node_fs2.existsSync)(cwd)) {
      const entry = findGitEntry(cwd);
      if (entry) {
        let commonDir = entry.gitPath;
        if ((0, import_node_fs2.statSync)(entry.gitPath).isFile()) {
          const gitdir = (0, import_node_fs2.readFileSync)(entry.gitPath, "utf8").match(/gitdir:\s*(.+)/)?.[1]?.trim();
          if (gitdir) {
            const abs = (0, import_node_path2.resolve)(entry.root, gitdir);
            const common = (0, import_node_path2.join)(abs, "commondir");
            commonDir = (0, import_node_fs2.existsSync)(common) ? (0, import_node_path2.resolve)(abs, (0, import_node_fs2.readFileSync)(common, "utf8").trim()) : abs;
          }
        }
        result = { repo: readOriginFromConfig((0, import_node_path2.join)(commonDir, "config")), repoRoot: entry.root };
      }
    } else {
      const guess = guessProjectDirFromPath(cwd);
      if (guess !== cwd && (0, import_node_fs2.existsSync)(guess)) result = resolveRepo(guess);
    }
  } catch {
  }
  cache.set(cwd, result);
  return result;
}

// src/lib/refs.ts
var PR_URL_RE = /github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d{1,7})/gi;
var PR_MENTION_RE = /(?:\bPRs?\s*#?|\bpull requests?\s*#?|(?<![\w/#])#)(\d{2,7})\b/gi;
var LINEAR_URL_RE = /linear\.app\/([\w-]+)\/issue\/([A-Z][A-Z0-9]{1,9}-\d{1,6})/gi;
var seenLinearWorkspaces = /* @__PURE__ */ new Map();
var LINEAR_KEY_RE = /\b([A-Z][A-Z0-9]{1,9}-\d{1,6})\b/g;
var BRANCH_LINEAR_RE = /(?<![a-z0-9])([a-z][a-z0-9]{1,9}-\d{1,6})(?![a-z0-9])/gi;
var BRANCH_PR_RE = /(?<![a-z0-9])(?:pr|pull)[-_]?(\d{2,7})(?![a-z0-9])/gi;
var BRANCH_NUMBER_RE = /(?<![a-z0-9])(\d{2,7})(?![a-z0-9])/gi;
var REF_WEIGHTS = {
  link: 40,
  branchPr: 30,
  branchNumber: 12,
  branchLinear: 30,
  urlUser: 25,
  urlAssistant: 6,
  mentionUser: 15,
  mentionAssistant: 4,
  capUser: 45,
  capAssistant: 12
};
var NOT_ISSUE_PREFIXES = /* @__PURE__ */ new Set([
  "PR",
  "PRS",
  "PRR",
  "UTF",
  "ISO",
  "SHA",
  "RFC",
  "MD",
  "GPT",
  "CVE",
  "HTTP",
  "TLS",
  "SSL",
  "RSA",
  "AES",
  "HMAC",
  "ES",
  "TS",
  "EC",
  "BIP",
  "BOLT",
  "NIP",
  "LN",
  "OP",
  "ERC",
  "EIP",
  "IEEE",
  "IPV",
  "X",
  "PIN",
  "TX",
  "V",
  "GH",
  "ISSUE",
  "TICKET",
  "STEP",
  "PHASE",
  "PART",
  "PAGE",
  "LINE",
  "ROW",
  "COL",
  "ID",
  "NO",
  "REV",
  "REVIEW",
  "PATCH",
  "TOP",
  "P",
  "Q",
  "H",
  "S",
  "M",
  "L",
  "E",
  "T",
  "N",
  "A",
  "B",
  "C",
  "D",
  "F",
  "G",
  "I",
  "J",
  "K",
  "O",
  "R",
  "U",
  "W",
  "Y",
  "Z",
  "LINGUI",
  "REACT",
  "NEXT",
  "NODE",
  "NPM",
  "PNPM",
  "YARN",
  "TYPESCRIPT",
  "MANTINE",
  "EXPO",
  "PYTHON"
]);
function isIssueKey(key) {
  const prefix = key.split("-")[0].toUpperCase();
  return prefix.length >= 2 && !NOT_ISSUE_PREFIXES.has(prefix);
}
var RefCollector = class {
  map = /* @__PURE__ */ new Map();
  constructor(existing = []) {
    for (const r of existing) this.map.set(this.key(r.kind, r.value, r.source), { ...r });
  }
  key(kind, value, source) {
    return `${kind}|${value}|${source}`;
  }
  add(kind, value, source, weight, cap = Infinity) {
    const k = this.key(kind, value, source);
    const cur = this.map.get(k);
    if (cur) cur.weight = Math.min(cap, cur.weight + weight);
    else this.map.set(k, { kind, value, source, weight: Math.min(cap, weight) });
  }
  addLink(prNumber, repo) {
    this.add("pr", String(prNumber), "link", REF_WEIGHTS.link, REF_WEIGHTS.link);
    if (repo) this.add("pr_repo", `${repo.toLowerCase()}#${prNumber}`, "link", REF_WEIGHTS.link, REF_WEIGHTS.link);
  }
  addBranch(branch) {
    if (!branch) return;
    const seenNumbers = /* @__PURE__ */ new Set();
    for (const m of branch.matchAll(BRANCH_PR_RE)) {
      seenNumbers.add(m[1]);
      this.add("pr", m[1], "branch", REF_WEIGHTS.branchPr, REF_WEIGHTS.branchPr);
    }
    for (const m of branch.matchAll(BRANCH_NUMBER_RE)) {
      if (seenNumbers.has(m[1])) continue;
      this.add("pr", m[1], "branch", REF_WEIGHTS.branchNumber, REF_WEIGHTS.branchNumber);
    }
    for (const m of branch.matchAll(BRANCH_LINEAR_RE)) {
      const key = m[1].toUpperCase();
      if (isIssueKey(key)) this.add("linear", key, "branch", REF_WEIGHTS.branchLinear, REF_WEIGHTS.branchLinear);
    }
  }
  addText(role, text) {
    if (!text) return;
    const cap = role === "user" ? REF_WEIGHTS.capUser : REF_WEIGHTS.capAssistant;
    const urlW = role === "user" ? REF_WEIGHTS.urlUser : REF_WEIGHTS.urlAssistant;
    const mentionW = role === "user" ? REF_WEIGHTS.mentionUser : REF_WEIGHTS.mentionAssistant;
    const sample = text.length > 2e4 ? text.slice(0, 2e4) : text;
    for (const m of sample.matchAll(PR_URL_RE)) {
      this.add("pr", m[3], role, urlW, cap);
      this.add("pr_repo", `${m[1]}/${m[2]}#${m[3]}`.toLowerCase(), role, urlW, cap);
    }
    for (const m of sample.matchAll(PR_MENTION_RE)) this.add("pr", m[1], role, mentionW, cap);
    for (const m of sample.matchAll(LINEAR_URL_RE)) {
      this.add("linear", m[2].toUpperCase(), role, urlW, cap);
      seenLinearWorkspaces.set(m[1], (seenLinearWorkspaces.get(m[1]) ?? 0) + 1);
    }
    for (const m of sample.matchAll(LINEAR_KEY_RE)) if (isIssueKey(m[1])) this.add("linear", m[1], role, mentionW, cap);
  }
  entries() {
    return [...this.map.values()];
  }
};

// src/lib/providers/claude.ts
var import_node_fs4 = require("node:fs");
var import_node_path3 = require("node:path");

// src/lib/jsonl.ts
var import_node_fs3 = require("node:fs");
async function* readJsonlLines(file, start = 0) {
  const stream = (0, import_node_fs3.createReadStream)(file, { start, highWaterMark: 1 << 20 });
  let pos = start;
  let carry = [];
  let carryLen = 0;
  for await (const chunk of stream) {
    let from = 0;
    for (; ; ) {
      const nl = chunk.indexOf(10, from);
      if (nl === -1) break;
      const piece = chunk.subarray(from, nl);
      let lineBuf;
      if (carryLen > 0) {
        carry.push(piece);
        lineBuf = Buffer.concat(carry);
        carry = [];
        carryLen = 0;
      } else {
        lineBuf = piece;
      }
      pos += nl - from + 1;
      const text = lineBuf.toString("utf8");
      if (text.length > 1) yield { text, end: pos, partial: false };
      from = nl + 1;
    }
    if (from < chunk.length) {
      const rest = chunk.subarray(from);
      carry.push(rest);
      carryLen += rest.length;
      pos += rest.length;
    }
  }
  if (carryLen > 0) {
    const text = Buffer.concat(carry).toString("utf8");
    if (text.trim().length > 0) yield { text, end: pos, partial: true };
  }
}
function safeJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

// src/lib/text.ts
var WRAPPER_TAGS = [
  "system-reminder",
  "local-command-caveat",
  "local-command-stdout",
  "local-command-stderr",
  "app-context",
  "permissions instructions",
  "skills_instructions",
  "collaboration_mode",
  "environment_context",
  "recommended_plugins",
  "user_instructions",
  "skill",
  "turn_aborted",
  "ide_opened_file",
  "ide_selection",
  "attached_files",
  "task-notification",
  "command-message"
];
var NOISE_PREFIXES = [
  "Caveat: The messages below were generated",
  "Base directory for this skill:",
  "# AGENTS.md instructions",
  "[Request interrupted",
  "This session is being continued from a previous conversation"
];
var wrapperRegexes = WRAPPER_TAGS.map((tag) => {
  const t = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<${t}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${t}>`, "gi");
});
var COMMAND_RE = /<command-name>([^<]*)<\/command-name>\s*(?:<command-args>([\s\S]*?)<\/command-args>)?/i;
var USER_QUERY_RE = /<user_query>([\s\S]*?)<\/user_query>/gi;
function cleanText(raw) {
  if (!raw) return "";
  let text = raw;
  const queries = [...text.matchAll(USER_QUERY_RE)].map((m) => m[1].trim()).filter(Boolean);
  if (queries.length > 0) text = queries.join("\n\n");
  const cmd = COMMAND_RE.exec(text);
  if (cmd) {
    const name = cmd[1].trim();
    const args = (cmd[2] ?? "").trim();
    text = text.replace(cmd[0], `${name.startsWith("/") ? name : "/" + name} ${args}`.trim());
  }
  for (const re of wrapperRegexes) text = text.replace(re, " ");
  const req = text.indexOf("## My request:");
  if (req !== -1) text = text.slice(req + "## My request:".length);
  text = text.replace(/<\/?antml:[^>]*>/g, " ");
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.startsWith("<") && /^<[a-z_-]+[^>]*>[\s\S]*<\/[a-z_-]+>\s*$/i.test(text)) return "";
  for (const p of NOISE_PREFIXES) if (text.startsWith(p)) return "";
  return text;
}
function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}
function makeTitle(text, max = 90) {
  const lines = text.split("\n").map(
    (l) => l.replace(/^#+\s*/, "").replace(/^>\s*/, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/https?:\/\/github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)\S*/g, "$1#$2").replace(/https?:\/\/\S+/g, (u) => truncate(u.replace(/^https?:\/\//, ""), 40)).trim()
  ).filter((l) => l.length > 0);
  const firstLine = lines.find((l) => !l.startsWith("<")) ?? lines[0] ?? "";
  return truncate(firstLine.replace(/\s+/g, " "), max);
}
function oneLine(text, max = 200) {
  return truncate(text.replace(/\s+/g, " ").trim(), max);
}

// src/lib/providers/claude.ts
var MAX_MESSAGE_CHARS = 3e4;
var MAX_TOOL_CHARS = 300;
var SKIP_TYPES = [
  '"type":"attachment"',
  '"type":"file-history-snapshot"',
  '"type":"file-history-delta"',
  '"type":"progress"',
  '"type":"queue-operation"',
  '"type":"atis-latch"',
  '"type":"bridge-session"',
  '"type":"last-prompt"',
  '"type":"mode"',
  '"type":"system"'
];
function isSkippableClaudeLine(text) {
  const head = text.length > 400 ? text.slice(0, 400) : text;
  for (const t of SKIP_TYPES) if (head.includes(t)) return true;
  if (head.includes('"type":"user"')) {
    const idx = text.indexOf('"content":[{');
    if (idx !== -1) {
      const open = text.slice(idx + 11, idx + 40);
      if (open.startsWith('"tool_use_id"') || open.startsWith('"type":"tool_result"')) return true;
    }
  }
  return false;
}
var TITLE_RANK = { "custom-title": 4, "ai-title": 3, summary: 2, "agent-name": 1, prompt: 0 };
function claudeProjectsDir() {
  return (0, import_node_path3.join)(homeOf("claude"), "projects");
}
function toolLine(name, input) {
  if (!input || typeof input !== "object") return name;
  const i = input;
  const val = i.file_path ?? i.path ?? i.notebook_path ?? i.pattern ?? i.command ?? i.url ?? i.query ?? i.description;
  if (typeof val !== "string") return name;
  return truncate(`${name} ${val}`.replace(/\s+/g, " "), MAX_TOOL_CHARS);
}
var claudeProvider = {
  id: "claude",
  async prepare() {
  },
  async discover() {
    const root = claudeProjectsDir();
    const out = [];
    let projectDirs = [];
    try {
      projectDirs = (0, import_node_fs4.readdirSync)(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => (0, import_node_path3.join)(root, e.name));
    } catch {
      return out;
    }
    for (const dir of projectDirs) {
      let entries;
      try {
        entries = (0, import_node_fs4.readdirSync)(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
        const file = (0, import_node_path3.join)(dir, e.name);
        try {
          const st = (0, import_node_fs4.statSync)(file);
          if (st.size === 0) continue;
          out.push({ agent: "claude", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
        } catch {
        }
      }
    }
    return out;
  },
  async parse(file, previous, ctx2) {
    const sessionId = (0, import_node_path3.basename)(file.file, ".jsonl");
    const id = `claude:${sessionId}`;
    const state = previous ? { ...previous, fileSize: file.size, fileMtime: file.mtime } : {
      id,
      agent: "claude",
      sessionId,
      file: file.file,
      fileSize: file.size,
      fileMtime: file.mtime,
      indexedBytes: 0,
      title: null,
      titleSource: null,
      cwd: null,
      repo: null,
      repoRoot: null,
      branch: null,
      createdAt: null,
      updatedAt: null,
      messageCount: 0,
      firstPrompt: null,
      lastPrompt: null,
      entrypoint: null,
      archived: false,
      hidden: false
    };
    const start = previous ? previous.indexedBytes : 0;
    const refs = new RefCollector(previous ? ctx2.existingRefs(id) : []);
    const messages = [];
    let titleRank = previous?.titleSource ? TITLE_RANK[previous.titleSource] ?? 0 : -1;
    let consumed = start;
    let prRepo = null;
    const setTitle = (source, value) => {
      const v = value?.trim();
      if (!v) return;
      const rank = TITLE_RANK[source] ?? 0;
      if (rank > titleRank || rank === titleRank && source !== "prompt") {
        state.title = makeTitle(v, 120);
        state.titleSource = source;
        titleRank = rank;
      }
    };
    for await (const line of readJsonlLines(file.file, start)) {
      if (isSkippableClaudeLine(line.text)) {
        if (!line.partial) consumed = line.end;
        continue;
      }
      const rec = safeJson(line.text);
      if (!rec) {
        if (line.partial) break;
        consumed = line.end;
        continue;
      }
      consumed = line.end;
      const ts = rec.timestamp ? Date.parse(rec.timestamp) : NaN;
      if (!Number.isNaN(ts)) {
        if (state.createdAt === null || ts < state.createdAt) state.createdAt = ts;
        if (state.updatedAt === null || ts > state.updatedAt) state.updatedAt = ts;
      }
      if (rec.cwd) state.cwd = rec.cwd;
      if (rec.relocatedCwd) state.cwd = rec.relocatedCwd;
      if (rec.gitBranch) state.branch = rec.gitBranch;
      if (rec.entrypoint && !state.entrypoint) state.entrypoint = rec.entrypoint;
      switch (rec.type) {
        case "custom-title":
          setTitle("custom-title", rec.customTitle);
          continue;
        case "ai-title":
          setTitle("ai-title", rec.aiTitle);
          continue;
        case "summary":
          setTitle("summary", rec.summary);
          continue;
        case "agent-name":
          setTitle("agent-name", rec.agentName);
          continue;
        case "pr-link":
          if (rec.prNumber !== void 0) {
            refs.addLink(rec.prNumber, rec.prRepository ?? null);
            if (rec.prRepository) prRepo = rec.prRepository;
          }
          continue;
        case "user":
        case "assistant":
          break;
        default:
          continue;
      }
      if (rec.isMeta || rec.isSidechain) continue;
      const content = rec.message?.content;
      const role = rec.type;
      const texts = [];
      if (typeof content === "string") {
        texts.push(content);
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (!block || typeof block !== "object") continue;
          const b = block;
          if (b.type === "text" && typeof b.text === "string") texts.push(b.text);
          else if (b.type === "tool_use" && typeof b.name === "string") {
            const tl = toolLine(b.name, b.input);
            if (tl) messages.push({ role: "tool", ts: Number.isNaN(ts) ? null : ts, text: tl });
          }
        }
      }
      const raw = texts.join("\n").trim();
      if (!raw) continue;
      const text = role === "user" ? cleanText(raw) : raw.trim();
      if (!text) continue;
      const stored = truncate(text, MAX_MESSAGE_CHARS);
      messages.push({ role, ts: Number.isNaN(ts) ? null : ts, text: stored });
      refs.addText(role, stored);
      state.messageCount += 1;
      if (role === "user") {
        if (!state.firstPrompt) {
          state.firstPrompt = oneLine(text, 300);
          setTitle("prompt", text);
        }
        state.lastPrompt = oneLine(text, 300);
      }
    }
    state.indexedBytes = consumed;
    if (state.updatedAt === null) state.updatedAt = file.mtime;
    if (state.createdAt === null) state.createdAt = state.updatedAt;
    refs.addBranch(state.branch);
    const git = ctx2.resolveRepo(state.cwd);
    state.repo = git.repo ?? prRepo ?? state.repo;
    state.repoRoot = git.repoRoot ?? state.repoRoot;
    if (!state.title) state.title = state.firstPrompt ? makeTitle(state.firstPrompt) : null;
    state.hidden = !previous && state.messageCount === 0 && !state.title;
    return { state, messages, refs: refs.entries() };
  }
};

// src/lib/providers/codex.ts
var import_node_fs5 = require("node:fs");
var import_node_path4 = require("node:path");
var import_node_sqlite2 = require("node:sqlite");
var MAX_MESSAGE_CHARS2 = 3e4;
var MAX_TOOL_CHARS2 = 300;
function codexHome() {
  return homeOf("codex");
}
function walkJsonl(dir, out) {
  let entries;
  try {
    entries = (0, import_node_fs5.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = (0, import_node_path4.join)(dir, e.name);
    if (e.isDirectory()) walkJsonl(p, out);
    else if (e.isFile() && e.name.endsWith(".jsonl")) {
      try {
        const st = (0, import_node_fs5.statSync)(p);
        if (st.size > 0) out.push({ agent: "codex", file: p, size: st.size, mtime: Math.floor(st.mtimeMs) });
      } catch {
      }
    }
  }
}
function newestStateDb(home) {
  let best = null;
  try {
    for (const name of (0, import_node_fs5.readdirSync)(home)) {
      const m = name.match(/^state_(\d+)\.sqlite$/);
      if (m && (!best || Number(m[1]) > best.n)) best = { path: (0, import_node_path4.join)(home, name), n: Number(m[1]) };
    }
  } catch {
    return null;
  }
  return best?.path ?? null;
}
var threadMeta = /* @__PURE__ */ new Map();
var importedThreadIds = /* @__PURE__ */ new Set();
var HIDDEN_THREAD_SOURCES = /* @__PURE__ */ new Set(["subagent", "guardian_review", "onboarding_checklist"]);
function loadImportedThreads(home) {
  importedThreadIds = /* @__PURE__ */ new Set();
  const file = (0, import_node_path4.join)(home, "external_agent_session_imports.json");
  if (!(0, import_node_fs5.existsSync)(file)) return;
  try {
    const data = JSON.parse((0, import_node_fs5.readFileSync)(file, "utf8"));
    for (const r of data.records ?? []) if (r.imported_thread_id) importedThreadIds.add(r.imported_thread_id);
  } catch {
  }
}
function loadThreadMeta(home) {
  threadMeta = /* @__PURE__ */ new Map();
  const dbPath = newestStateDb(home);
  if (dbPath) {
    try {
      const db2 = new import_node_sqlite2.DatabaseSync(dbPath, { readOnly: true });
      try {
        const cols = new Set(db2.prepare(`PRAGMA table_info(threads)`).all().map((c) => c.name));
        const pick2 = (c, alias = c) => cols.has(c) ? `${c} AS ${alias}` : `NULL AS ${alias}`;
        const sql = `SELECT id, ${pick2("title")}, ${pick2("git_branch")}, ${pick2("cwd")}, ${pick2("archived")},
          ${pick2("git_origin_url")}, ${pick2("thread_source")}, ${pick2("source")}, ${pick2("first_user_message")},
          ${pick2("updated_at_ms")}, ${pick2("updated_at")} FROM threads`;
        for (const r of db2.prepare(sql).all()) {
          const source = typeof r.source === "string" ? r.source : "";
          threadMeta.set(String(r.id), {
            title: r.title || null,
            branch: r.git_branch || null,
            cwd: r.cwd || null,
            archived: Number(r.archived ?? 0) === 1,
            originUrl: r.git_origin_url || null,
            subagent: HIDDEN_THREAD_SOURCES.has(String(r.thread_source ?? "")) || source.startsWith("{") || source === "exec",
            firstUserMessage: r.first_user_message || null,
            updatedAtMs: r.updated_at_ms ?? (r.updated_at ? Number(r.updated_at) * 1e3 : null)
          });
        }
      } finally {
        db2.close();
      }
    } catch {
    }
  }
  const indexFile = (0, import_node_path4.join)(home, "session_index.jsonl");
  if ((0, import_node_fs5.existsSync)(indexFile)) {
    try {
      for (const line of (0, import_node_fs5.readFileSync)(indexFile, "utf8").split("\n")) {
        const rec = safeJson(line);
        if (!rec?.id) continue;
        const name = (rec.thread_name ?? rec.title ?? "").trim();
        if (!name) continue;
        const cur = threadMeta.get(rec.id) ?? {};
        if (!cur.title) threadMeta.set(rec.id, { ...cur, title: name });
      }
    } catch {
    }
  }
}
function isSkippableCodexLine(text) {
  const head = text.length > 160 ? text.slice(0, 160) : text;
  if (head.includes('"type":"response_item"')) {
    return head.includes('"type":"function_call_output"') || head.includes('"type":"custom_tool_call_output"') || head.includes('"type":"reasoning"') || head.includes('"type":"agent_message"') || head.includes('"role":"developer"');
  }
  if (head.includes('"type":"event_msg"')) return !head.includes("thread_name_updated");
  return !(head.includes('"type":"session_meta"') || head.includes('"type":"turn_context"'));
}
function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const c of content) {
    if (c && typeof c === "object") {
      const b = c;
      if ((b.type === "input_text" || b.type === "output_text" || b.type === "text") && typeof b.text === "string") {
        parts.push(b.text);
      }
    }
  }
  return parts.join("\n");
}
var codexProvider = {
  id: "codex",
  async prepare() {
    const home = codexHome();
    loadThreadMeta(home);
    loadImportedThreads(home);
  },
  async discover() {
    const home = codexHome();
    const out = [];
    walkJsonl((0, import_node_path4.join)(home, "sessions"), out);
    if (getConfig().includeArchived) {
      walkJsonl((0, import_node_path4.join)(home, "archived_sessions"), out);
    }
    return out;
  },
  async parse(file, previous, ctx2) {
    const fromName = file.file.match(
      /rollout-.*?-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i
    )?.[1];
    let sessionId = previous?.sessionId ?? fromName ?? "";
    const isArchivedDir = file.file.includes("/archived_sessions/");
    const state = previous ? { ...previous, fileSize: file.size, fileMtime: file.mtime } : {
      id: "",
      agent: "codex",
      sessionId,
      file: file.file,
      fileSize: file.size,
      fileMtime: file.mtime,
      indexedBytes: 0,
      title: null,
      titleSource: null,
      cwd: null,
      repo: null,
      repoRoot: null,
      branch: null,
      createdAt: null,
      updatedAt: null,
      messageCount: 0,
      firstPrompt: null,
      lastPrompt: null,
      entrypoint: null,
      archived: isArchivedDir,
      hidden: false
    };
    const start = previous ? previous.indexedBytes : 0;
    const refs = new RefCollector(previous ? ctx2.existingRefs(previous.id) : []);
    const messages = [];
    let consumed = start;
    let hidden = previous?.hidden ?? false;
    let threadName = null;
    let repoUrl = null;
    let seenMeta = !!previous;
    for await (const line of readJsonlLines(file.file, start)) {
      if (isSkippableCodexLine(line.text)) {
        if (!line.partial) consumed = line.end;
        continue;
      }
      const rec = safeJson(line.text);
      if (!rec) {
        if (line.partial) break;
        consumed = line.end;
        continue;
      }
      consumed = line.end;
      const p = rec.payload ?? {};
      const ts = rec.timestamp ? Date.parse(rec.timestamp) : NaN;
      if (!Number.isNaN(ts)) {
        if (state.createdAt === null || ts < state.createdAt) state.createdAt = ts;
        if (state.updatedAt === null || ts > state.updatedAt) state.updatedAt = ts;
      }
      if (rec.type === "session_meta") {
        if (seenMeta) continue;
        seenMeta = true;
        const metaId = p.id ?? p.session_id;
        if (metaId) sessionId = metaId;
        if (typeof p.cwd === "string") state.cwd = p.cwd;
        if (typeof p.originator === "string") state.entrypoint = p.originator;
        const source = p.source;
        if (source && typeof source === "object") hidden = true;
        if (typeof p.thread_source === "string" && HIDDEN_THREAD_SOURCES.has(p.thread_source)) hidden = true;
        if (metaId && importedThreadIds.has(metaId)) hidden = true;
        const git2 = p.git;
        if (git2?.branch) state.branch = git2.branch;
        if (git2?.repository_url) repoUrl = git2.repository_url;
        if (hidden) break;
        continue;
      }
      if (hidden) break;
      if (rec.type === "turn_context") {
        if (typeof p.cwd === "string" && !state.cwd) state.cwd = p.cwd;
        continue;
      }
      if (rec.type === "event_msg") {
        if (p.type === "thread_name_updated" && typeof p.thread_name === "string") threadName = p.thread_name;
        continue;
      }
      if (rec.type !== "response_item") continue;
      const ptype = p.type;
      if (ptype === "message") {
        const role = p.role;
        if (role !== "user" && role !== "assistant") continue;
        const raw = contentText(p.content).trim();
        if (!raw) continue;
        const text = role === "user" ? cleanText(raw) : raw;
        if (!text) continue;
        const stored = truncate(text, MAX_MESSAGE_CHARS2);
        messages.push({ role, ts: Number.isNaN(ts) ? null : ts, text: stored });
        refs.addText(role, stored);
        state.messageCount += 1;
        if (role === "user") {
          if (!state.firstPrompt) state.firstPrompt = oneLine(text, 300);
          state.lastPrompt = oneLine(text, 300);
        }
      } else if (ptype === "function_call" || ptype === "custom_tool_call" || ptype === "local_shell_call") {
        const name = typeof p.name === "string" ? p.name : ptype;
        const args = typeof p.arguments === "string" ? p.arguments : typeof p.input === "string" ? p.input : "";
        messages.push({
          role: "tool",
          ts: Number.isNaN(ts) ? null : ts,
          text: truncate(`${name} ${args}`.replace(/\s+/g, " "), MAX_TOOL_CHARS2)
        });
      }
    }
    if (!sessionId) sessionId = fromName ?? file.file;
    state.sessionId = sessionId;
    state.id = `codex:${sessionId}`;
    state.indexedBytes = consumed;
    state.hidden = hidden;
    const meta = threadMeta.get(sessionId);
    if (meta?.subagent || importedThreadIds.has(sessionId)) state.hidden = true;
    if (meta?.archived) state.archived = true;
    if (meta?.branch && !state.branch) state.branch = meta.branch;
    if (meta?.cwd && !state.cwd) state.cwd = meta.cwd;
    if (meta?.originUrl && !repoUrl) repoUrl = meta.originUrl;
    if (meta?.updatedAtMs && (!state.updatedAt || meta.updatedAtMs > state.updatedAt))
      state.updatedAt = meta.updatedAtMs;
    if (state.updatedAt === null) state.updatedAt = file.mtime;
    if (state.createdAt === null) state.createdAt = state.updatedAt;
    const title = meta?.title || threadName || previous?.title || null;
    if (title) {
      state.title = makeTitle(title, 120);
      state.titleSource = meta?.title ? "state-db" : threadName ? "thread-name" : previous?.titleSource ?? null;
    } else if (state.firstPrompt) {
      state.title = makeTitle(state.firstPrompt);
      state.titleSource = "prompt";
    } else if (meta?.firstUserMessage) {
      const cleaned = cleanText(meta.firstUserMessage);
      if (cleaned) {
        state.title = makeTitle(cleaned);
        state.titleSource = "prompt";
      }
    }
    refs.addBranch(state.branch);
    const git = ctx2.resolveRepo(state.cwd);
    state.repo = git.repo ?? parseRemoteUrl(repoUrl) ?? state.repo;
    state.repoRoot = git.repoRoot ?? state.repoRoot;
    if (!state.hidden && !previous && state.messageCount === 0 && !state.title) state.hidden = true;
    return { state, messages, refs: refs.entries() };
  }
};

// src/lib/providers/copilot.ts
var import_node_fs6 = require("node:fs");
var import_node_path5 = require("node:path");

// src/lib/providers/base.ts
var import_node_sqlite3 = require("node:sqlite");
var MAX_MESSAGE_CHARS3 = 3e4;
var MAX_TOOL_CHARS3 = 300;
var SessionBuilder = class {
  state;
  messages = [];
  refs;
  titleRank = -1;
  constructor(agent, sessionId, file, previous = null) {
    if (previous?.title) this.titleRank = 0;
    this.state = previous ? { ...previous, fileSize: file.size, fileMtime: file.mtime } : {
      id: `${agent}:${sessionId}`,
      agent,
      sessionId,
      file: file.file,
      fileSize: file.size,
      fileMtime: file.mtime,
      indexedBytes: 0,
      title: null,
      titleSource: null,
      cwd: null,
      repo: null,
      repoRoot: null,
      branch: null,
      createdAt: null,
      updatedAt: null,
      messageCount: 0,
      firstPrompt: null,
      lastPrompt: null,
      entrypoint: null,
      archived: false,
      hidden: false
    };
    this.refs = new RefCollector([]);
  }
  /** Widen the session's time span with a timestamp in epoch milliseconds. */
  touch(ts) {
    if (ts === null || ts === void 0 || !Number.isFinite(ts) || ts <= 0) return;
    if (this.state.createdAt === null || ts < this.state.createdAt) this.state.createdAt = ts;
    if (this.state.updatedAt === null || ts > this.state.updatedAt) this.state.updatedAt = ts;
  }
  /**
   * Record a title candidate. Higher `rank` wins; equal ranks keep the first one unless
   * `lastWins` is set, which is what agents that re-append their current title need.
   */
  setTitle(source, value, rank, lastWins = false) {
    const v = value?.trim();
    if (!v) return;
    if (rank < this.titleRank || rank === this.titleRank && !lastWins) return;
    const title = makeTitle(v, 120);
    if (!title) return;
    this.state.title = title;
    this.state.titleSource = source;
    this.titleRank = rank;
  }
  addMessage(role, raw, ts) {
    const trimmed = raw?.trim();
    if (!trimmed) return;
    const text = role === "user" ? cleanText(trimmed) : trimmed;
    if (!text) return;
    const stored = truncate(text, MAX_MESSAGE_CHARS3);
    this.touch(ts);
    this.messages.push({ role, ts: ts ?? null, text: stored });
    this.refs.addText(role, stored);
    this.state.messageCount += 1;
    if (role === "user") {
      if (!this.state.firstPrompt) this.state.firstPrompt = oneLine(text, 300);
      this.state.lastPrompt = oneLine(text, 300);
    }
  }
  /** One compact line per tool call: the tool name plus its most identifying argument. */
  addTool(name, detail, ts) {
    if (!name) return;
    const arg = toolDetail(detail);
    this.touch(ts);
    this.messages.push({
      role: "tool",
      ts: ts ?? null,
      text: truncate(`${name}${arg ? ` ${arg}` : ""}`.replace(/\s+/g, " "), MAX_TOOL_CHARS3)
    });
  }
  addPrLink(prNumber, repo) {
    this.refs.addLink(prNumber, repo);
  }
  /** Fill in derived fields (repo, timestamps, fallback title) and produce the parse result. */
  finish(file, ctx2, opts = {}) {
    const state = this.state;
    if (opts.indexedBytes !== void 0) state.indexedBytes = opts.indexedBytes;
    if (state.updatedAt === null) state.updatedAt = file.mtime;
    if (state.createdAt === null) state.createdAt = state.updatedAt;
    this.refs.addBranch(state.branch);
    const git = ctx2.resolveRepo(state.cwd);
    state.repo = git.repo ?? parseRemoteUrl(opts.repoUrl) ?? state.repo;
    state.repoRoot = git.repoRoot ?? state.repoRoot;
    if (!state.title && state.firstPrompt) {
      state.title = makeTitle(state.firstPrompt);
      state.titleSource = "prompt";
    }
    if (state.messageCount === 0 && !state.title) state.hidden = true;
    return { state, messages: this.messages, refs: this.refs.entries() };
  }
};
function toolDetail(input) {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object") return "";
  const i = input;
  const val = i.file_path ?? i.filePath ?? i.absolute_path ?? i.path ?? i.notebook_path ?? i.pattern ?? i.command ?? i.cmd ?? i.url ?? i.query ?? i.description ?? i.prompt;
  return typeof val === "string" ? val : "";
}
function dbSessionFile(dbPath, sessionId) {
  return `${dbPath}#${sessionId}`;
}
function splitDbSessionFile(file) {
  const at = file.lastIndexOf("#");
  return at === -1 ? { dbPath: file, sessionId: "" } : { dbPath: file.slice(0, at), sessionId: file.slice(at + 1) };
}
function openReadOnly(path) {
  try {
    return new import_node_sqlite3.DatabaseSync(path, { readOnly: true });
  } catch {
    return null;
  }
}
function tablesOf(db2) {
  try {
    const rows = db2.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all();
    return new Set(rows.map((r) => r.name));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function columnsOf(db2, table) {
  try {
    const rows = db2.prepare(`PRAGMA table_info(${table})`).all();
    return new Set(rows.map((r) => r.name));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function pick(cols, col) {
  return cols.has(col) ? `${col} AS ${col}` : `NULL AS ${col}`;
}

// src/lib/providers/copilot.ts
function parseTs(value) {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}
function readWorkspace(dir) {
  const out = {};
  let text;
  try {
    text = (0, import_node_fs6.readFileSync)((0, import_node_path5.join)(dir, "workspace.yaml"), "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length > 1 || value.startsWith("'") && value.endsWith("'") && value.length > 1) {
      value = value.slice(1, -1);
    }
    if (value && value !== "null" && value !== "~") out[m[1]] = value;
  }
  return out;
}
function collect(root, out) {
  let entries;
  try {
    entries = (0, import_node_fs6.readdirSync)(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const file = (0, import_node_path5.join)(root, e.name, "events.jsonl");
    try {
      const st = (0, import_node_fs6.statSync)(file);
      if (st.size > 0) out.push({ agent: "copilot", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {
    }
  }
}
var copilotProvider = {
  id: "copilot",
  async prepare() {
  },
  async discover() {
    const home = homeOf("copilot");
    const out = [];
    collect((0, import_node_path5.join)(home, "session-state"), out);
    const legacy = (0, import_node_path5.join)(home, "history-session-state");
    if ((0, import_node_fs6.existsSync)(legacy)) collect(legacy, out);
    return out;
  },
  async parse(file, previous, ctx2) {
    const dir = (0, import_node_path5.dirname)(file.file);
    const ws = readWorkspace(dir);
    const sessionId = ws.id || (0, import_node_path5.basename)(dir);
    const b = new SessionBuilder("copilot", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.cwd = ws.cwd ?? ws.git_root ?? null;
    b.state.branch = ws.branch ?? null;
    b.setTitle("workspace-name", ws.name, ws.user_named === "true" ? 4 : 2);
    b.touch(parseTs(ws.created_at));
    b.touch(parseTs(ws.updated_at));
    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson(line.text);
      if (!rec || rec.ephemeral || rec.agentId !== void 0) continue;
      const ts = parseTs(rec.timestamp);
      switch (rec.type) {
        case "session.title_changed":
          if (typeof rec.data?.title === "string") b.setTitle("title-changed", rec.data.title, 3, true);
          break;
        case "user.message":
          if (rec.data?.source === void 0 && typeof rec.data?.content === "string") {
            b.addMessage("user", rec.data.content, ts);
          } else {
            b.touch(ts);
          }
          break;
        case "assistant.message":
          if (typeof rec.data?.content === "string") b.addMessage("assistant", rec.data.content, ts);
          break;
        case "tool.execution_start":
          if (typeof rec.data?.toolName === "string") b.addTool(rec.data.toolName, rec.data.arguments, ts);
          break;
        default:
          break;
      }
    }
    return b.finish(file, ctx2, { repoUrl: ws.repository ? `https://github.com/${ws.repository}` : null });
  }
};

// src/lib/providers/crush.ts
var import_node_fs7 = require("node:fs");
var import_node_path6 = require("node:path");
var DEFAULT_TITLES = /* @__PURE__ */ new Set(["New Session", "Untitled Session", "Generate a title"]);
var projectCwds = /* @__PURE__ */ new Map();
function registryFile() {
  return (0, import_node_path6.join)(homeOf("crush"), "projects.json");
}
function loadProjects() {
  let raw;
  try {
    raw = (0, import_node_fs7.readFileSync)(registryFile(), "utf8");
  } catch {
    return [];
  }
  const parsed = safeJson(raw);
  const list = Array.isArray(parsed) ? parsed : parsed?.projects ?? [];
  const out = [];
  for (const p of list) {
    if (!p?.path) continue;
    const dataDir2 = p.data_dir || (0, import_node_path6.join)(p.path, ".crush");
    out.push({ dbPath: (0, import_node_path6.join)(dataDir2, "crush.db"), cwd: p.path });
  }
  return out;
}
var crushProvider = {
  id: "crush",
  async prepare() {
    projectCwds = new Map(loadProjects().map((p) => [p.dbPath, p.cwd]));
  },
  async discover() {
    const out = [];
    for (const dbPath of projectCwds.keys()) {
      const db2 = openReadOnly(dbPath);
      if (!db2) continue;
      try {
        if (!tablesOf(db2).has("sessions")) continue;
        const cols = columnsOf(db2, "sessions");
        const where = cols.has("parent_session_id") ? "parent_session_id IS NULL" : "1";
        const rows = db2.prepare(`SELECT id, ${pick(cols, "updated_at")}, ${pick(cols, "created_at")} FROM sessions WHERE ${where}`).all();
        for (const r of rows) {
          out.push({
            agent: "crush",
            file: dbSessionFile(dbPath, r.id),
            size: 0,
            mtime: toMillis(r.updated_at ?? r.created_at) ?? 0
          });
        }
      } finally {
        db2.close();
      }
    }
    return out;
  },
  async parse(file, previous, ctx2) {
    const { dbPath, sessionId } = splitDbSessionFile(file.file);
    const b = new SessionBuilder("crush", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.cwd = projectCwds.get(dbPath) ?? (0, import_node_path6.dirname)((0, import_node_path6.dirname)(dbPath));
    const db2 = openReadOnly(dbPath);
    if (!db2) return b.finish(file, ctx2);
    try {
      readSession(db2, sessionId, b);
    } finally {
      db2.close();
    }
    return b.finish(file, ctx2);
  }
};
function readSession(db2, sessionId, b) {
  const cols = columnsOf(db2, "sessions");
  const row = db2.prepare(
    `SELECT ${pick(cols, "title")}, ${pick(cols, "created_at")}, ${pick(cols, "updated_at")}
              FROM sessions WHERE id = ?`
  ).get(sessionId);
  if (row) {
    const title = row.title;
    if (title && !DEFAULT_TITLES.has(title)) b.setTitle("session-title", title, 3);
    b.touch(toMillis(row.created_at));
    b.touch(toMillis(row.updated_at));
  }
  if (!tablesOf(db2).has("messages")) return;
  const mcols = columnsOf(db2, "messages");
  const rows = db2.prepare(
    `SELECT role, ${pick(mcols, "parts")}, ${pick(mcols, "created_at")}
       FROM messages WHERE session_id = ? ORDER BY ${mcols.has("created_at") ? "created_at, " : ""}id`
  ).all(sessionId);
  for (const m of rows) {
    const role = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : null;
    if (!role) continue;
    const ts = toMillis(m.created_at);
    const parts = safeJson(m.parts ?? "");
    const texts = [];
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
function toMillis(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value * 1e3);
}

// src/lib/providers/cursor.ts
var import_node_fs8 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path7 = require("node:path");
var import_node_sqlite4 = require("node:sqlite");
var MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
var TIMESTAMP_RE = /<timestamp>[^,<]*,\s*([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*\(UTC([+-]\d{1,2})(?::(\d{2}))?\)/i;
function parseCursorTimestamp(text) {
  const m = TIMESTAMP_RE.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
  if (month === -1) return null;
  let hour = Number(m[4]) % 12;
  if (m[6].toUpperCase() === "PM") hour += 12;
  const offset = Number(m[7]);
  const iso = `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}T${String(hour).padStart(2, "0")}:${m[5]}:00${offset < 0 ? "-" : "+"}${String(Math.abs(offset)).padStart(2, "0")}:${m[8] ?? "00"}`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}
function cursorStateDb() {
  return (0, import_node_path7.join)((0, import_node_os2.homedir)(), "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
}
var composers = /* @__PURE__ */ new Map();
function loadComposerMeta() {
  composers = /* @__PURE__ */ new Map();
  let db2;
  try {
    db2 = new import_node_sqlite4.DatabaseSync(cursorStateDb(), { readOnly: true });
  } catch {
    return;
  }
  try {
    const rows = db2.prepare(
      `SELECT key,
           json_extract(value,'$.name') AS name,
           json_extract(value,'$.createdAt') AS createdAt,
           json_extract(value,'$.lastUpdatedAt') AS lastUpdatedAt,
           json_extract(value,'$.workspaceIdentifier.uri.fsPath') AS fsPath,
           json_extract(value,'$.trackedGitRepos[0].repoPath') AS repoPath,
           json_extract(value,'$.trackedGitRepos[0].branches[0].branchName') AS branch,
           json_extract(value,'$.agentBackend') AS backend
         FROM cursorDiskKV WHERE key >= 'composerData:' AND key < 'composerData;'`
    ).all();
    for (const r of rows) {
      const id = String(r.key).slice("composerData:".length);
      composers.set(id, {
        title: r.name || null,
        createdAt: numberOrNull(r.createdAt),
        updatedAt: numberOrNull(r.lastUpdatedAt),
        cwd: r.fsPath || r.repoPath || null,
        branch: r.branch || null,
        backend: r.backend || null
      });
    }
  } catch {
  } finally {
    db2.close();
  }
}
function numberOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
function blocks(content) {
  return Array.isArray(content) ? content : [];
}
function modalCwd(counts) {
  let best = null;
  let bestCount = 0;
  const home = (0, import_node_os2.homedir)();
  for (const [dir, n] of counts) {
    if (dir === home || dir.includes("/.cursor/")) continue;
    if (n > bestCount) {
      best = dir;
      bestCount = n;
    }
  }
  return best;
}
var cursorProvider = {
  id: "cursor",
  async prepare() {
    loadComposerMeta();
  },
  async discover() {
    const projects = (0, import_node_path7.join)(homeOf("cursor"), "projects");
    const out = [];
    let slugs = [];
    try {
      slugs = (0, import_node_fs8.readdirSync)(projects, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name);
    } catch {
      return out;
    }
    for (const slug of slugs) {
      const root = (0, import_node_path7.join)(projects, slug, "agent-transcripts");
      let sessions;
      try {
        sessions = (0, import_node_fs8.readdirSync)(root, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const s of sessions) {
        if (!s.isDirectory()) continue;
        const file = (0, import_node_path7.join)(root, s.name, `${s.name}.jsonl`);
        try {
          const st = (0, import_node_fs8.statSync)(file);
          if (st.size === 0) continue;
          out.push({ agent: "cursor", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
        } catch {
        }
      }
    }
    return out;
  },
  async parse(file, previous, ctx2) {
    const sessionId = (0, import_node_path7.basename)(file.file, ".jsonl");
    const meta = composers.get(sessionId);
    const b = new SessionBuilder("cursor", sessionId, file, previous);
    b.state.entrypoint = meta?.backend ?? "cursor";
    b.state.branch = meta?.branch ?? null;
    b.setTitle("composer-name", meta?.title, 3);
    const cwdCounts = /* @__PURE__ */ new Map();
    let ts = null;
    let firstTs = null;
    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson(line.text);
      if (!rec) continue;
      const role = rec.role === "user" ? "user" : rec.role === "assistant" ? "assistant" : null;
      if (!role) continue;
      const texts = [];
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
          const dir = block.input?.working_directory;
          if (typeof dir === "string" && dir.startsWith("/")) cwdCounts.set(dir, (cwdCounts.get(dir) ?? 0) + 1);
        }
      }
      b.addMessage(role, texts.join("\n"), ts);
    }
    let createdAt = meta?.createdAt ?? firstTs;
    if (createdAt === null || createdAt === void 0) {
      try {
        const born = Math.floor((0, import_node_fs8.statSync)((0, import_node_path7.dirname)(file.file)).birthtimeMs);
        if (born > 0) createdAt = born;
      } catch {
      }
    }
    b.state.updatedAt = Math.max(file.mtime, meta?.updatedAt ?? 0);
    b.state.createdAt = createdAt && createdAt <= b.state.updatedAt ? createdAt : b.state.updatedAt;
    b.state.cwd = meta?.cwd ?? modalCwd(cwdCounts);
    return b.finish(file, ctx2);
  }
};

// src/lib/providers/droid.ts
var import_node_fs9 = require("node:fs");
var import_node_path8 = require("node:path");
var HIDDEN_TAGS = /* @__PURE__ */ new Set(["subagent", "exec", "btw-fork"]);
function parseTs2(value) {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}
function blockText(content, onTool) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const texts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
    else if (block.type === "tool_use" && typeof block.name === "string") onTool(block.name, block.input);
  }
  return texts.join("\n");
}
function sidecar(file) {
  try {
    const raw = JSON.parse((0, import_node_fs9.readFileSync)(file.replace(/\.jsonl$/, ".settings.json"), "utf8"));
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const names = tags.map((t) => typeof t === "string" ? t : t?.name ?? "");
    return { archived: !!raw.archivedAt, hidden: names.some((n) => HIDDEN_TAGS.has(n)) };
  } catch {
    return { archived: false, hidden: false };
  }
}
function collect2(dir, out, recurse) {
  let entries;
  try {
    entries = (0, import_node_fs9.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (recurse && e.name.startsWith("-")) collect2((0, import_node_path8.join)(dir, e.name), out, false);
      continue;
    }
    if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
    const file = (0, import_node_path8.join)(dir, e.name);
    try {
      const st = (0, import_node_fs9.statSync)(file);
      if (st.size > 0) out.push({ agent: "droid", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {
    }
  }
}
var droidProvider = {
  id: "droid",
  async prepare() {
  },
  async discover() {
    const out = [];
    collect2((0, import_node_path8.join)(homeOf("droid"), "sessions"), out, true);
    return out;
  },
  async parse(file, previous, ctx2) {
    const meta = sidecar(file.file);
    let sessionId = (0, import_node_path8.basename)(file.file, ".jsonl");
    const b = new SessionBuilder("droid", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.archived = meta.archived;
    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson(line.text);
      if (!rec) continue;
      if (rec.type === "session_start") {
        if (rec.id) sessionId = rec.id;
        b.state.cwd = rec.lastCwd || rec.cwd || null;
        if (rec.parent || rec.callingSessionId || rec.decompSessionType === "worker") b.state.hidden = true;
        b.setTitle("session-title", rec.title, 3);
        if (b.state.hidden) break;
        continue;
      }
      if (rec.type !== "message") continue;
      const m = rec.message;
      const role = m?.role === "user" ? "user" : m?.role === "assistant" ? "assistant" : null;
      if (!role) continue;
      if (m?.visibility === "user_only" || m?.visibility === "llm_only") continue;
      const ts = parseTs2(rec.timestamp);
      const text = blockText(m?.content, (name, input) => b.addTool(name, input, ts));
      b.addMessage(role, text, ts);
    }
    b.state.sessionId = sessionId;
    b.state.id = `droid:${sessionId}`;
    if (meta.hidden) b.state.hidden = true;
    return b.finish(file, ctx2);
  }
};

// src/lib/providers/gemini.ts
var import_node_crypto = require("node:crypto");
var import_node_fs10 = require("node:fs");
var import_node_path9 = require("node:path");
var SESSION_FILE = /^session-.*\.jsonl?$/;
var projectRoots = /* @__PURE__ */ new Map();
function loadProjectRoots(home) {
  projectRoots = /* @__PURE__ */ new Map();
  const byName = /* @__PURE__ */ new Map();
  const registry = safeJson(readFileOrEmpty((0, import_node_path9.join)(home, "projects.json")));
  for (const [path, slug] of Object.entries(registry?.projects ?? {})) {
    byName.set(slug, path);
    byName.set((0, import_node_crypto.createHash)("sha256").update(path).digest("hex"), path);
  }
  const tmp = (0, import_node_path9.join)(home, "tmp");
  for (const name of listDirs(tmp)) {
    const marker = readFileOrEmpty((0, import_node_path9.join)(tmp, name, ".project_root")).trim();
    const root = marker || byName.get(name);
    if (root) projectRoots.set(name, root);
  }
}
function readFileOrEmpty(file) {
  try {
    return (0, import_node_fs10.readFileSync)(file, "utf8");
  } catch {
    return "";
  }
}
function listDirs(dir) {
  try {
    return (0, import_node_fs10.readdirSync)(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
function partsToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(partsToText).join("");
  if (content && typeof content === "object") {
    const p = content;
    if (typeof p.text === "string") return p.text;
  }
  return "";
}
function parseTs3(value) {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}
async function replay(file) {
  const meta = {};
  let messages = /* @__PURE__ */ new Map();
  const apply = (rec) => {
    if (typeof rec.$rewindTo === "string") {
      const ids = [...messages.keys()];
      const at = ids.indexOf(rec.$rewindTo);
      messages = at === -1 ? /* @__PURE__ */ new Map() : new Map(ids.slice(0, at).map((id) => [id, messages.get(id)]));
      return;
    }
    if (typeof rec.id === "string") {
      messages.set(rec.id, rec);
      return;
    }
    const patch = rec.$set && typeof rec.$set === "object" ? rec.$set : rec;
    if (Array.isArray(patch.messages)) {
      messages = new Map(patch.messages.filter((m) => m?.id).map((m) => [m.id, m]));
    }
    Object.assign(meta, { ...patch, messages: void 0 });
  };
  for await (const line of readJsonlLines(file)) {
    const rec = safeJson(line.text);
    if (rec) apply(rec);
  }
  if (!meta.sessionId && file.endsWith(".json")) {
    const whole = safeJson(readFileOrEmpty(file));
    if (whole?.sessionId) {
      if (Array.isArray(whole.messages)) {
        messages = new Map(whole.messages.filter((m) => m?.id).map((m) => [m.id, m]));
      }
      Object.assign(meta, { ...whole, messages: void 0 });
    }
  }
  return { meta, messages: [...messages.values()] };
}
function projectRootFor(file) {
  return projectRoots.get((0, import_node_path9.basename)((0, import_node_path9.join)(file, "..", ".."))) ?? null;
}
var geminiProvider = {
  id: "gemini",
  async prepare() {
    loadProjectRoots(homeOf("gemini"));
  },
  async discover() {
    const tmp = (0, import_node_path9.join)(homeOf("gemini"), "tmp");
    const byName = /* @__PURE__ */ new Map();
    for (const project of listDirs(tmp)) {
      const chats = (0, import_node_path9.join)(tmp, project, "chats");
      let entries;
      try {
        entries = (0, import_node_fs10.readdirSync)(chats, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        if (!e.isFile() || !SESSION_FILE.test(e.name)) continue;
        const file = (0, import_node_path9.join)(chats, e.name);
        try {
          const st = (0, import_node_fs10.statSync)(file);
          if (st.size === 0) continue;
          const found = { agent: "gemini", file, size: st.size, mtime: Math.floor(st.mtimeMs) };
          const seen = byName.get(e.name);
          if (!seen || found.mtime > seen.mtime) byName.set(e.name, found);
        } catch {
        }
      }
    }
    return [...byName.values()];
  },
  async parse(file, previous, ctx2) {
    const { meta, messages } = await replay(file.file);
    const sessionId = meta.sessionId ?? (0, import_node_path9.basename)(file.file).replace(/\.jsonl?$/, "");
    const b = new SessionBuilder("gemini", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.cwd = projectRootFor(file.file);
    b.touch(parseTs3(meta.startTime));
    b.touch(parseTs3(meta.lastUpdated));
    b.setTitle("summary", meta.summary, 2);
    for (const m of messages) {
      const ts = parseTs3(m.timestamp);
      if (m.type === "user") {
        b.addMessage("user", partsToText(m.content ?? m.displayContent), ts);
      } else if (m.type === "gemini") {
        b.addMessage("assistant", partsToText(m.content ?? m.displayContent), ts);
        for (const call of m.toolCalls ?? []) {
          b.addTool(call.displayName || call.name || "tool", call.args, parseTs3(call.timestamp) ?? ts);
        }
      }
    }
    if (meta.kind === "subagent") b.state.hidden = true;
    return b.finish(file, ctx2);
  }
};

// src/lib/providers/goose.ts
var import_node_path10 = require("node:path");
var HIDDEN_TYPES = /* @__PURE__ */ new Set(["sub_agent", "hidden"]);
var MILLISECOND_THRESHOLD = 1e10;
function databasePath() {
  return (0, import_node_path10.join)(homeOf("goose"), "sessions", "sessions.db");
}
function parseSqlTime(value) {
  if (typeof value !== "string" || !value) return null;
  const t = Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(t) ? null : t;
}
function parseEpoch(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value > MILLISECOND_THRESHOLD ? value : value * 1e3;
}
var gooseProvider = {
  id: "goose",
  async prepare() {
  },
  async discover() {
    const dbPath = databasePath();
    const db2 = openReadOnly(dbPath);
    if (!db2) return [];
    try {
      if (!tablesOf(db2).has("sessions")) return [];
      const cols = columnsOf(db2, "sessions");
      const where = cols.has("session_type") ? `session_type IS NULL OR session_type NOT IN ('sub_agent', 'hidden')` : "1";
      const rows = db2.prepare(`SELECT id, ${pick(cols, "updated_at")}, ${pick(cols, "created_at")} FROM sessions WHERE ${where}`).all();
      return rows.map((r) => ({
        agent: "goose",
        file: dbSessionFile(dbPath, String(r.id)),
        size: 0,
        mtime: parseSqlTime(r.updated_at) ?? parseSqlTime(r.created_at) ?? 0
      }));
    } finally {
      db2.close();
    }
  },
  async parse(file, previous, ctx2) {
    const { dbPath, sessionId } = splitDbSessionFile(file.file);
    const b = new SessionBuilder("goose", sessionId, file, previous);
    b.state.entrypoint = "cli";
    const db2 = openReadOnly(dbPath);
    if (!db2) return b.finish(file, ctx2);
    try {
      readSession2(db2, sessionId, b);
    } finally {
      db2.close();
    }
    return b.finish(file, ctx2);
  }
};
function readSession2(db2, sessionId, b) {
  const cols = columnsOf(db2, "sessions");
  const row = db2.prepare(
    `SELECT ${pick(cols, "name")}, ${pick(cols, "description")}, ${pick(cols, "working_dir")},
              ${pick(cols, "session_type")}, ${pick(cols, "created_at")}, ${pick(cols, "updated_at")},
              ${pick(cols, "archived_at")}
       FROM sessions WHERE id = ?`
  ).get(sessionId);
  if (row) {
    b.setTitle("session-name", row.name || row.description, 3);
    b.state.cwd = row.working_dir || null;
    if (row.archived_at) b.state.archived = true;
    if (row.session_type && HIDDEN_TYPES.has(row.session_type)) b.state.hidden = true;
    b.touch(parseSqlTime(row.created_at));
    b.touch(parseSqlTime(row.updated_at));
    if (b.state.hidden) return;
  }
  if (!tablesOf(db2).has("messages")) return;
  const mcols = columnsOf(db2, "messages");
  const rows = db2.prepare(
    `SELECT role, ${pick(mcols, "content_json")}, ${pick(mcols, "created_timestamp")}
       FROM messages WHERE session_id = ? ORDER BY ${mcols.has("created_timestamp") ? "created_timestamp, " : ""}id`
  ).all(sessionId);
  for (const m of rows) {
    const role = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : null;
    if (!role) continue;
    const ts = parseEpoch(m.created_timestamp);
    const blocks2 = safeJson(m.content_json ?? "");
    const texts = [];
    for (const block of Array.isArray(blocks2) ? blocks2 : []) {
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

// src/lib/providers/opencode.ts
var import_node_fs11 = require("node:fs");
var import_node_path11 = require("node:path");
var DEFAULT_TITLE = /^(New session|Child session) - \d{4}-\d{2}-\d{2}T/;
function dataDir() {
  return homeOf("opencode");
}
function databases() {
  const dir = dataDir();
  try {
    return (0, import_node_fs11.readdirSync)(dir, { withFileTypes: true }).filter((e) => e.isFile() && /^opencode.*\.db$/.test(e.name)).map((e) => (0, import_node_path11.join)(dir, e.name));
  } catch {
    return [];
  }
}
var opencodeProvider = {
  id: "opencode",
  async prepare() {
  },
  async discover() {
    const out = [];
    for (const dbPath of databases()) {
      const db2 = openReadOnly(dbPath);
      if (!db2) continue;
      try {
        if (!tablesOf(db2).has("session")) continue;
        const cols = columnsOf(db2, "session");
        const rows = db2.prepare(
          `SELECT id, ${pick(cols, "time_updated")}, ${pick(cols, "time_created")} FROM session
             WHERE ${cols.has("parent_id") ? "parent_id IS NULL" : "1"}`
        ).all();
        for (const r of rows) {
          out.push({
            agent: "opencode",
            file: dbSessionFile(dbPath, r.id),
            size: 0,
            mtime: Math.floor(r.time_updated ?? r.time_created ?? 0)
          });
        }
      } finally {
        db2.close();
      }
    }
    return out;
  },
  async parse(file, previous, ctx2) {
    const { dbPath, sessionId } = splitDbSessionFile(file.file);
    const b = new SessionBuilder("opencode", sessionId, file, previous);
    b.state.entrypoint = "cli";
    const db2 = openReadOnly(dbPath);
    if (!db2) return b.finish(file, ctx2);
    try {
      readSession3(db2, sessionId, b);
    } finally {
      db2.close();
    }
    return b.finish(file, ctx2);
  }
};
function readSession3(db2, sessionId, b) {
  const cols = columnsOf(db2, "session");
  const row = db2.prepare(
    `SELECT ${pick(cols, "title")}, ${pick(cols, "directory")}, ${pick(cols, "time_created")},
              ${pick(cols, "time_updated")}, ${pick(cols, "time_archived")}, ${pick(cols, "agent")}
       FROM session WHERE id = ?`
  ).get(sessionId);
  if (row) {
    const title = row.title;
    if (title && !DEFAULT_TITLE.test(title)) b.setTitle("session-title", title, 3);
    b.state.cwd = row.directory || null;
    if (row.agent) b.state.entrypoint = String(row.agent);
    if (row.time_archived) b.state.archived = true;
    b.touch(numberOrNull2(row.time_created));
    b.touch(numberOrNull2(row.time_updated));
  }
  const tables = tablesOf(db2);
  if (tables.has("message")) {
    const messages = db2.prepare(`SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created, id`).all(sessionId);
    const partsFor = tables.has("part") ? db2.prepare(`SELECT data FROM part WHERE message_id = ? ORDER BY id`) : null;
    for (const m of messages) {
      const msg = safeJson(m.data);
      if (!msg) continue;
      const parts = partsFor?.all(m.id) ?? [];
      addMessage(
        b,
        msg,
        parts.map((p) => safeJson(p.data)).filter((p) => !!p)
      );
    }
    return;
  }
  if (tables.has("session_message")) {
    const rows = db2.prepare(`SELECT data FROM session_message WHERE session_id = ? ORDER BY seq, id`).all(sessionId);
    for (const r of rows) {
      const msg = safeJson(r.data);
      if (msg) addMessage(b, msg, msg.parts ?? []);
    }
  }
}
function addMessage(b, msg, parts) {
  const role = msg.role === "user" ? "user" : msg.role === "assistant" ? "assistant" : null;
  if (!role) return;
  const ts = numberOrNull2(msg.time?.created);
  const texts = [];
  for (const p of parts) {
    if (p.type === "text" && typeof p.text === "string" && !p.synthetic && !p.ignored) texts.push(p.text);
    else if (p.type === "tool" && typeof p.tool === "string") b.addTool(p.tool, p.state?.input, ts);
  }
  b.addMessage(role, texts.join("\n"), ts);
}
function numberOrNull2(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

// src/lib/providers/qwen.ts
var import_node_fs12 = require("node:fs");
var import_node_path12 = require("node:path");
var SESSION_FILE2 = /^[0-9a-fA-F-]{32,36}\.jsonl$/;
function partsText(parts) {
  if (!Array.isArray(parts)) return "";
  return parts.filter((p) => p && !p.thought && typeof p.text === "string").map((p) => p.text).join("");
}
function parseTs4(value) {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}
function collect3(dir, archived, out) {
  let entries;
  try {
    entries = (0, import_node_fs12.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory() && !archived && e.name === "archive") {
      if (getConfig().includeArchived) collect3((0, import_node_path12.join)(dir, e.name), true, out);
      continue;
    }
    if (!e.isFile() || !SESSION_FILE2.test(e.name)) continue;
    const file = (0, import_node_path12.join)(dir, e.name);
    try {
      const st = (0, import_node_fs12.statSync)(file);
      if (st.size > 0) out.push({ agent: "qwen", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {
    }
  }
}
var qwenProvider = {
  id: "qwen",
  async prepare() {
  },
  async discover() {
    const projects = (0, import_node_path12.join)(homeOf("qwen"), "projects");
    const out = [];
    let dirs = [];
    try {
      dirs = (0, import_node_fs12.readdirSync)(projects, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return out;
    }
    for (const dir of dirs) collect3((0, import_node_path12.join)(projects, dir, "chats"), false, out);
    return out;
  },
  async parse(file, previous, ctx2) {
    const sessionId = (0, import_node_path12.basename)(file.file, ".jsonl");
    const b = new SessionBuilder("qwen", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.archived = file.file.includes("/chats/archive/");
    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson(line.text);
      if (!rec) continue;
      const ts = parseTs4(rec.timestamp);
      if (rec.cwd) b.state.cwd = rec.cwd;
      if (rec.gitBranch) b.state.branch = rec.gitBranch;
      b.touch(ts);
      if (rec.isSidechain || rec.agentId) continue;
      switch (rec.type) {
        case "user":
          if (rec.subtype === void 0 && (rec.provenance === void 0 || rec.provenance === "real_user")) {
            b.addMessage("user", rec.systemPayload?.displayText || partsText(rec.message?.parts), ts);
          }
          break;
        case "assistant":
          b.addMessage("assistant", partsText(rec.message?.parts), ts);
          for (const p of rec.message?.parts ?? []) {
            if (p?.functionCall?.name) b.addTool(p.functionCall.name, p.functionCall.args, ts);
          }
          break;
        case "system":
          if (rec.subtype === "custom_title") b.setTitle("custom-title", rec.systemPayload?.customTitle, 3, true);
          break;
        default:
          break;
      }
    }
    if (!b.state.updatedAt || file.mtime > b.state.updatedAt) b.state.updatedAt = file.mtime;
    return b.finish(file, ctx2);
  }
};

// src/lib/providers/index.ts
var providers = [
  claudeProvider,
  codexProvider,
  cursorProvider,
  geminiProvider,
  qwenProvider,
  copilotProvider,
  opencodeProvider,
  crushProvider,
  gooseProvider,
  droidProvider
];

// src/lib/indexer.ts
var ctx = {
  resolveRepo,
  existingRefs: (sessionId) => loadRefs(sessionId)
};
async function refreshIndex(opts = {}) {
  const started = Date.now();
  const lock = acquireLock();
  if (!lock) return { scanned: 0, indexed: 0, removed: 0, durationMs: 0 };
  try {
    const existing = loadAllStates();
    const discovered = [];
    for (const p of providers) {
      await p.prepare();
      discovered.push(...await p.discover());
    }
    const seen = /* @__PURE__ */ new Set();
    const work = [];
    for (const f of discovered) {
      seen.add(f.file);
      const prev = existing.get(f.file);
      if (prev && prev.fileSize === f.size && prev.fileMtime === f.mtime) continue;
      const append = !!prev && !prev.hidden && f.size > prev.indexedBytes && prev.indexedBytes > 0;
      work.push({ file: f, previous: append ? prev : null, append });
    }
    let removed = 0;
    for (const file of existing.keys()) {
      if (!seen.has(file)) {
        deleteSessionByFile(file);
        removed++;
      }
    }
    work.sort((a, b) => b.file.mtime - a.file.mtime);
    let indexed = 0;
    for (let i = 0; i < work.length; i++) {
      if (opts.signal?.aborted) break;
      const { file, previous, append } = work[i];
      const provider = providers.find((p) => p.id === file.agent);
      if (!provider) continue;
      try {
        const result = await provider.parse(file, previous, ctx);
        if (!append) deleteSessionByFile(file.file);
        writeSession(result.state, result.messages, result.refs, append);
        indexed++;
      } catch (e) {
        console.error(`index failed for ${file.file}`, e);
      }
      if (opts.onProgress && (i % 10 === 0 || i === work.length - 1)) {
        opts.onProgress({ done: i + 1, total: work.length, file: file.file });
      }
      if (i % 25 === 0) await new Promise((r) => setImmediate(r));
      if (i % 100 === 0) heartbeatLock(lock);
    }
    if (indexed > 0 || removed > 0) {
      setMeta("lastIndexedAt", String(Date.now()));
      const ws = [...seenLinearWorkspaces.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (ws) setMeta("linearWorkspace", ws);
      if (indexed > 200) {
        try {
          getDb().exec(`INSERT INTO messages_fts(messages_fts) VALUES('optimize')`);
        } catch {
        }
      }
    }
    return { scanned: discovered.length, indexed, removed, durationMs: Date.now() - started };
  } finally {
    releaseLock(lock);
  }
}

// src/worker/index-worker.ts
async function main() {
  const payload = JSON.parse(process.argv[2] ?? "{}");
  if (!payload.config) throw new Error("missing config");
  setConfig(payload.config);
  if (payload.mode === "rebuild") {
    if (isLocked()) throw new Error("An index refresh is running; retry the rebuild in a minute");
    dropDb();
  }
  let last = 0;
  const summary = await refreshIndex({
    onProgress: (p) => {
      const now = Date.now();
      if (now - last < 200 && p.done !== p.total) return;
      last = now;
      process.stdout.write(JSON.stringify({ progress: { done: p.done, total: p.total } }) + "\n");
    }
  });
  process.stdout.write(JSON.stringify({ summary }) + "\n");
}
main().catch((e) => {
  process.stdout.write(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) + "\n");
  process.exit(1);
});
