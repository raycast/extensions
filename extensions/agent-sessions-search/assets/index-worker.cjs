"use strict";

// src/lib/db.ts
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");

// src/lib/config.ts
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var current = null;
function setConfig(cfg) {
  current = cfg;
}
function getConfig() {
  if (!current) throw new Error("Index configuration not initialised");
  return current;
}

// src/lib/db.ts
var import_node_sqlite = require("node:sqlite");
var SCHEMA_VERSION = "3";
var db = null;
function getDb() {
  if (db) return db;
  const path = getConfig().dbPath;
  (0, import_node_fs.mkdirSync)((0, import_node_path2.dirname)(path), { recursive: true });
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
var import_node_path3 = require("node:path");
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
  let dir = (0, import_node_path3.resolve)(start);
  for (let i = 0; i < 40; i++) {
    const gitPath = (0, import_node_path3.join)(dir, ".git");
    if ((0, import_node_fs2.existsSync)(gitPath)) return { root: dir, gitPath };
    const parent = (0, import_node_path3.dirname)(dir);
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
            const abs = (0, import_node_path3.resolve)(entry.root, gitdir);
            const common = (0, import_node_path3.join)(abs, "commondir");
            commonDir = (0, import_node_fs2.existsSync)(common) ? (0, import_node_path3.resolve)(abs, (0, import_node_fs2.readFileSync)(common, "utf8").trim()) : abs;
          }
        }
        result = { repo: readOriginFromConfig((0, import_node_path3.join)(commonDir, "config")), repoRoot: entry.root };
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
var import_node_path4 = require("node:path");

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
function cleanText(raw) {
  if (!raw) return "";
  let text = raw;
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
  return getConfig().claudeProjectsDir;
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
      projectDirs = (0, import_node_fs4.readdirSync)(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => (0, import_node_path4.join)(root, e.name));
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
        const file = (0, import_node_path4.join)(dir, e.name);
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
    const sessionId = (0, import_node_path4.basename)(file.file, ".jsonl");
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
var import_node_path5 = require("node:path");
var import_node_sqlite2 = require("node:sqlite");
var MAX_MESSAGE_CHARS2 = 3e4;
var MAX_TOOL_CHARS2 = 300;
function codexHome() {
  return getConfig().codexHome;
}
function walkJsonl(dir, out) {
  let entries;
  try {
    entries = (0, import_node_fs5.readdirSync)(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = (0, import_node_path5.join)(dir, e.name);
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
      if (m && (!best || Number(m[1]) > best.n)) best = { path: (0, import_node_path5.join)(home, name), n: Number(m[1]) };
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
  const file = (0, import_node_path5.join)(home, "external_agent_session_imports.json");
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
        const pick = (c, alias = c) => cols.has(c) ? `${c} AS ${alias}` : `NULL AS ${alias}`;
        const sql = `SELECT id, ${pick("title")}, ${pick("git_branch")}, ${pick("cwd")}, ${pick("archived")},
          ${pick("git_origin_url")}, ${pick("thread_source")}, ${pick("source")}, ${pick("first_user_message")},
          ${pick("updated_at_ms")}, ${pick("updated_at")} FROM threads`;
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
  const indexFile = (0, import_node_path5.join)(home, "session_index.jsonl");
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
    walkJsonl((0, import_node_path5.join)(home, "sessions"), out);
    if (getConfig().includeArchived) {
      walkJsonl((0, import_node_path5.join)(home, "archived_sessions"), out);
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

// src/lib/providers/index.ts
var providers = [claudeProvider, codexProvider];

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
