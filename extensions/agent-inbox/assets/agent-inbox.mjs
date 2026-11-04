#!/usr/bin/env node

// cli/agent-inbox.ts
import { appendFileSync, mkdirSync as mkdirSync6, readFileSync as readFileSync10 } from "node:fs";

// src/core/sources/locate.ts
import { readdirSync } from "node:fs";
import { join } from "node:path";
function findTranscript(root, sessionId, codex = false) {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return void 0;
  const matches = [];
  function visit(directory, depth) {
    try {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory() && depth < 4) visit(path, depth + 1);
        else if (entry.isFile() && (codex ? entry.name.endsWith(`-${sessionId}.jsonl`) : entry.name === `${sessionId}.jsonl`))
          matches.push(path);
      }
    } catch {
    }
  }
  visit(root, 0);
  return matches.length === 1 ? matches[0] : void 0;
}

// src/core/sources/claude-titles.ts
import { basename, dirname, join as join4 } from "node:path";
import { readFileSync as readFileSync2, statSync as statSync3 } from "node:fs";

// src/core/claude-desktop.ts
import { readdirSync as readdirSync2, readFileSync, statSync } from "node:fs";
import { join as join3 } from "node:path";

// src/core/paths.ts
import { homedir } from "node:os";
import { join as join2 } from "node:path";
var HOME = homedir();
var ROOT = process.env.AGENT_INBOX_HOME || join2(HOME, ".sessions");
var DB_PATH = join2(ROOT, "db.sqlite");
var CONFIG_PATH = join2(ROOT, "config.json");
var BIN_DIR = join2(ROOT, "bin");
var CLI_PATH = join2(BIN_DIR, "agent-inbox.mjs");
var ADAPTERS_DIR = join2(ROOT, "adapters");
var CACHE_DIR = join2(ROOT, "cache");
var LOG_PATH = join2(ROOT, "log.txt");
var CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join2(HOME, ".claude");
var CLAUDE_PROJECTS = join2(CLAUDE_DIR, "projects");
var CLAUDE_SETTINGS = join2(CLAUDE_DIR, "settings.json");
var CLAUDE_DESKTOP_SESSIONS = process.env.AGENT_INBOX_CLAUDE_DESKTOP_ROOT || join2(HOME, "Library", "Application Support", "Claude", "claude-code-sessions");
var CODEX_DIR = process.env.CODEX_HOME || join2(HOME, ".codex");
var CODEX_SESSIONS = join2(CODEX_DIR, "sessions");
var CODEX_CONFIG = join2(CODEX_DIR, "config.toml");
var CODEX_HOOKS = join2(CODEX_DIR, "hooks.json");
var CODEX_SESSION_INDEX = join2(CODEX_DIR, "session_index.jsonl");

// src/core/claude-desktop.ts
var CLAUDE_BUNDLE = "com.anthropic.claudefordesktop";
var CLAUDE_LOCAL_ID = /^local_[A-Za-z0-9-]{1,64}$/;
var CLAUDE_BRIDGE_ID = /^(?:cse|session)_([A-Za-z0-9-]{1,128})$/;
var text = (v) => typeof v === "string" ? v : "";
var time = (v) => typeof v === "number" && Number.isFinite(v) ? v : 0;
var cached = /* @__PURE__ */ new Map();
function readClaudeDesktopSessions(root = CLAUDE_DESKTOP_SESSIONS) {
  const records = [];
  const visit = (dir, depth) => {
    try {
      for (const entry of readdirSync2(dir, { withFileTypes: true })) {
        const path = join3(dir, entry.name);
        if (entry.isDirectory() && depth < 2) visit(path, depth + 1);
        else if (entry.isFile() && entry.name.startsWith("local_") && entry.name.endsWith(".json")) {
          try {
            const st = statSync(path);
            if (st.size > 10 * 1024 * 1024) continue;
            const hit = cached.get(path);
            let record2 = hit?.mtime === st.mtimeMs && hit.size === st.size ? hit.record : void 0;
            if (record2 === void 0) {
              const raw = JSON.parse(readFileSync(path, "utf8"));
              record2 = raw && CLAUDE_LOCAL_ID.test(text(raw.sessionId)) ? {
                sessionId: raw.sessionId,
                cliSessionId: text(raw.cliSessionId),
                cwd: text(raw.cwd),
                title: text(raw.title),
                createdAt: time(raw.createdAt),
                lastActivityAt: time(raw.lastActivityAt),
                lastFocusedAt: time(raw.lastFocusedAt),
                isArchived: raw.isArchived === true,
                ...bridgeAliases(raw.bridgeSessionIds)
              } : null;
              cached.set(path, { mtime: st.mtimeMs, size: st.size, record: record2 });
            }
            if (record2) records.push(record2);
          } catch {
          }
        }
      }
    } catch {
    }
  };
  visit(root, 0);
  return records;
}
function bridgeAliases(value) {
  const ids = (Array.isArray(value) ? value : [value]).filter(
    (id) => typeof id === "string" && CLAUDE_BRIDGE_ID.test(id)
  );
  return ids.length ? { bridgeSessionIds: [...new Set(ids)] } : {};
}
function sameClaudeBridgeId(a, b) {
  const suffix = a.match(CLAUDE_BRIDGE_ID)?.[1];
  return !!suffix && suffix === b.match(CLAUDE_BRIDGE_ID)?.[1];
}
function findClaudeDesktopSession(id, records) {
  const matches = records.filter(
    (r) => r.cliSessionId === id || r.sessionId === id || r.bridgeSessionIds?.some((b) => sameClaudeBridgeId(b, id))
  );
  return matches.length === 1 ? matches[0] : void 0;
}
function hasClaudeTerminalLocator(s3) {
  return s3.host === "cli" && (!!s3.locator.claudeEntrypoint && !/desktop/i.test(s3.locator.claudeEntrypoint) || (s3.status === "running" || s3.status === "needs_input") && !!(s3.locator.tty || s3.locator.tmuxPane) && s3.locator.bundleId !== CLAUDE_BUNDLE);
}
function enrichClaudeSessions(sessions, records) {
  if (!sessions.some((s3) => s3.agent === "claude")) return sessions;
  const desktop = records ?? readClaudeDesktopSessions();
  return sessions.map((s3) => {
    if (s3.agent !== "claude" || hasClaudeTerminalLocator(s3)) return s3;
    const record2 = findClaudeDesktopSession(s3.sessionId, desktop);
    if (!record2) return s3;
    return {
      ...s3,
      host: "app",
      title: record2.title || s3.title,
      cwd: record2.cwd || s3.cwd,
      locator: { ...s3.locator, claudeDesktopId: record2.sessionId }
    };
  });
}

// src/core/claude-window.ts
function claudeDocumentId(raw) {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" || url.hostname !== "claude.ai" || url.username || url.password) return void 0;
    return url.pathname.match(/^\/(?:epitaxy|code)\/((?:local_|session_|cse_)[A-Za-z0-9-]{1,128})\/?$/)?.[1];
  } catch {
    return void 0;
  }
}
function claudeWindowIdentity(window) {
  const sessionId = claudeDocumentId(window.url);
  if (!sessionId) return void 0;
  const other = window.documentUrl ? claudeDocumentId(window.documentUrl) : void 0;
  if (other && other !== sessionId && !sameClaudeBridgeId(other, sessionId)) return void 0;
  const title = window.title.replace(/\s+[-–—]\s+Claude(?: Code)?$/, "").trim().replace(/\s+/g, " ");
  return { sessionId, title: /^(?:Claude(?: Code)?|about:blank)?$/i.test(title) ? "" : title };
}

// src/core/exec.ts
import { execFile, spawn } from "node:child_process";
function run(file, args, input, timeoutMs = 5e3) {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { encoding: "utf8", timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: String(stdout ?? ""), stderr: String(stderr ?? (err ? String(err) : "")) });
      }
    );
    if (input !== void 0) {
      child.stdin?.on("error", () => void 0);
      child.stdin?.end(input);
    }
  });
}
function detach(file, args) {
  try {
    const child = spawn(file, args, { detached: true, stdio: "ignore" });
    child.on("error", () => void 0);
    child.unref();
  } catch {
  }
}
function osascript(script, lang = "AppleScript", args = []) {
  return run("/usr/bin/osascript", ["-l", lang, "-e", script, "--", ...args]);
}
function shQuote(s3) {
  if (/^[A-Za-z0-9_\-./:=@%+]+$/.test(s3)) return s3;
  return "'" + s3.replace(/'/g, "'\\''") + "'";
}

// src/core/focus-selection.ts
function selectWindowDocument(native, document) {
  const generic = (title2) => !title2.trim() || /^(?:Claude(?: Code)?|Codex|ChatGPT|about:blank)$/i.test(title2.trim());
  const title = generic(document.title) ? native.title : document.title;
  const shell = /^(?:app|file):/.test(document.url) && !/[#?]/.test(document.url);
  const url = shell && native.url ? native.url : document.url || native.url;
  return {
    title,
    url,
    ...!generic(native.title) && native.title !== title ? { windowTitle: native.title } : {},
    ...document.url && document.url !== url ? { documentUrl: document.url } : {}
  };
}

// src/core/native-focus.ts
function nativeFocusScript(mode = "focused") {
  return `
function run(argv) {
ObjC.import("AppKit");
ObjC.import("ApplicationServices");
ObjC.bindFunction("AXUIElementCreateApplication", ["id", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["id", "id", "id*"]]);
ObjC.bindFunction("CFGetTypeID", ["unsigned long", ["id"]]);
ObjC.bindFunction("CFURLGetTypeID", ["unsigned long", []]);
ObjC.bindFunction("CFURLGetString", ["id", ["id"]]);
const bundle = argv[0];
const selectDocument = ${selectWindowDocument.toString()};
function attribute(node, name) {
  const value = Ref();
  const error = $.AXUIElementCopyAttributeValue(node, $(name), value);
  if (error === -25211) throw new Error("AX_ACCESS_DENIED");
  return error === 0 ? value[0] : null;
}
function text(value) {
  if (!value) return "";
  if ($.CFGetTypeID(value) === $.CFURLGetTypeID()) return String(ObjC.unwrap($.CFURLGetString(value)));
  const unwrapped = ObjC.unwrap(value);
  return typeof unwrapped === "string" ? unwrapped : "";
}
function readWindow(window) {
  let result = { title: text(attribute(window, "AXTitle")), url: text(attribute(window, "AXDocument")) };
  const queue = [{ node: window, depth: 0 }];
  let visited = 0;
  while (queue.length && visited++ < 80) {
    const item = queue.shift();
    if (text(attribute(item.node, "AXRole")) === "AXWebArea") {
      const url = text(attribute(item.node, "AXURL"));
      const title = text(attribute(item.node, "AXTitle"));
      if (bundle === "com.anthropic.claudefordesktop" && (url.startsWith("file:") || (!url && !title))) continue;
      if (!url && !title) continue;
      return selectDocument(result, { title, url });
    }
    if (item.depth < 8) {
      const children = attribute(item.node, "AXChildren");
      if (children) for (let i = 0; i < children.count && queue.length < 80; i++) queue.push({ node: children.objectAtIndex(i), depth: item.depth + 1 });
    }
  }
  return result;
}
function readApplication() {
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier($(bundle));
  if (!apps.count) return ${mode === "windows" ? "[]" : "null"};
  const app = $.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  ${mode === "windows" ? `
  const windows = attribute(app, "AXWindows");
  const results = [];
  if (windows) for (let i = 0; i < windows.count && i < 12; i++) results.push(readWindow(windows.objectAtIndex(i)));
  return results;
  ` : `
  const window = attribute(app, "AXFocusedWindow");
  return window ? readWindow(window) : null;
  `}
}
return JSON.stringify(readApplication());
}
`;
}

// src/core/focused-window.ts
async function readClaudeTitleWindows(execute = osascript) {
  const result = await execute(nativeFocusScript("windows"), "JavaScript", ["com.anthropic.claudefordesktop"]);
  if (!result.ok) return [];
  try {
    const value = JSON.parse(result.stdout);
    return Array.isArray(value) ? value.filter(validWindow) : [];
  } catch {
    return [];
  }
}
function validWindow(value) {
  if (!value || typeof value !== "object") return false;
  const w = value;
  return typeof w.title === "string" && typeof w.url === "string" && (w.windowTitle === void 0 || typeof w.windowTitle === "string") && (w.documentUrl === void 0 || typeof w.documentUrl === "string");
}

// src/core/sources/collector.ts
import { closeSync, openSync, readSync, statSync as statSync2 } from "node:fs";
import { createHash } from "node:crypto";

// src/core/locate.ts
async function ttyOf(pid, execute = run) {
  const r = await execute("/bin/ps", ["-o", "tty=", "-p", String(pid)], void 0, 2e3);
  const tty = r.stdout.trim();
  if (!r.ok || !tty || tty.startsWith("?")) return void 0;
  return tty.startsWith("/dev/") ? tty : `/dev/${tty}`;
}
async function captureLocator(env, pid = process.ppid, execute = run) {
  const loc = {};
  if (env.TMUX_PANE) loc.tmuxPane = env.TMUX_PANE;
  if (env.TMUX) loc.tmuxSocket = env.TMUX.split(",")[0];
  if (env.__CFBundleIdentifier) loc.bundleId = env.__CFBundleIdentifier;
  if (env.TERM_PROGRAM) loc.termProgram = env.TERM_PROGRAM;
  const tty = await ttyOf(pid, execute);
  if (tty) loc.tty = tty;
  const seen = /* @__PURE__ */ new Set();
  for (let depth = 0; pid > 1 && depth < 12 && !seen.has(pid); depth++) {
    seen.add(pid);
    const process2 = await readProcess(pid, execute);
    if (!process2) break;
    if (isAgentProcess(process2.command) && process2.tty === loc.tty) {
      loc.pid = pid;
      loc.processStartedAt = process2.startedAt;
      break;
    }
    pid = process2.parent;
  }
  return loc;
}
function isAgentProcess(command) {
  const [executable, script = ""] = command.trim().split(/\s+/);
  if (/(?:^|\/)(?:claude|codex)$/.test(executable)) return true;
  return /(?:^|\/)node$/.test(executable) && /\/@(?:anthropic-ai\/claude-code|openai\/codex)\//.test(script);
}
async function readProcess(pid, execute = run) {
  const result = await execute(
    "/bin/ps",
    ["-ww", "-p", String(pid), "-o", "ppid=,tty=,lstart=,args="],
    void 0,
    2e3
  );
  if (!result.ok) return void 0;
  const match = result.stdout.trim().match(/^(\d+)\s+(\S+)\s+(\w{3}\s+\w{3}\s+\d+\s+\d+:\d+:\d+\s+\d{4})\s+(.+)$/);
  if (!match) return void 0;
  return {
    parent: Number(match[1]),
    tty: match[2].startsWith("/") ? match[2] : `/dev/${match[2]}`,
    startedAt: match[3].replace(/\s+/g, " "),
    command: match[4]
  };
}
async function terminalOwnerAlive(locator, execute = run) {
  if (!locator.tty || !locator.pid || !locator.processStartedAt) return false;
  const process2 = await readProcess(locator.pid, execute);
  return !!process2 && process2.tty === locator.tty && process2.startedAt === locator.processStartedAt && isAgentProcess(process2.command);
}
var TERMINAL_LOCATOR_KEYS = [
  "tty",
  "tmuxPane",
  "tmuxSocket",
  "pid",
  "processStartedAt",
  "observedAt"
];
function releaseTerminal(locator) {
  const next = { ...locator };
  for (const key2 of TERMINAL_LOCATOR_KEYS) delete next[key2];
  return next;
}

// src/core/status.ts
var TITLE_MAX = 80;
function toTitle(text2) {
  if (!text2) return "";
  const line = text2.replace(/<[^>]+>/g, " ").split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
  if (!line) return "";
  const clean = line.replace(/\s+/g, " ").replace(/^[#>*\-\s]+/, "");
  return clean.length > TITLE_MAX ? clean.slice(0, TITLE_MAX - 1) + "\u2026" : clean;
}
function lastSentence(text2, max = 240) {
  if (!text2) return "";
  const flat = text2.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  if (flat.length <= max) return flat;
  return "\u2026" + flat.slice(flat.length - max + 1);
}
function endsWithQuestion(text2) {
  if (!text2) return false;
  const t = text2.replace(/```[\s\S]*?```/g, "").trim().replace(/[\s*_`)"'」』）]+$/u, "");
  return /[?？]$/u.test(t);
}
function asksForInput(text2) {
  const value = (text2 ?? "").replace(/```[\s\S]*?```/g, "").trim();
  const tail = value.split(/\n\s*\n/).slice(-2).join("\n").split(/\r?\n/).filter((line) => !/^\s*[>|]/.test(line)).map((line) => line.trim().replace(/^(?:[-*]\s+|\d+[.)]\s+)?(?:\*\*)?/, "")).join("\n");
  return endsWithQuestion(tail) || /(?:^|[。！.!]\s*|\n)(?:(?:请|需要你|等你|等待你).{0,16}(?:确认|选择|回复|回答|授权|提供|输入)|(?:是否|要不要|你希望|您希望)[^\n]*[?？]|(?:please (?:confirm|choose|select|reply|provide)|waiting for (?:your|user) (?:input|approval|response)|(?:would you|shall I|should I)[^\n]*\?))/iu.test(
    tail
  );
}
function applyEvent(prev, ev) {
  if (!Number.isFinite(ev.at) || ev.at < 0) return null;
  const previous = prev?.state ?? {
    phase: prev?.status === "needs_input" ? "running" : prev?.status ?? "idle",
    at: prev && !["idle", "ready"].includes(prev.status) && !ev.snapshotComplete ? prev.updatedAt : 0,
    source: "legacy",
    pending: prev?.status === "needs_input" ? [{ id: "legacy", attention: prev.attention ?? "input", at: prev.updatedAt, inferred: true }] : [],
    resolved: []
  };
  const requestLifecycle = !!ev.requestIds?.length && ["needs_input", "resolved", "tool"].includes(ev.type);
  if (ev.at < previous.at && ev.type !== "snapshot" && !requestLifecycle) return null;
  const startsTurn = ev.type === "progress" || ev.type === "snapshot" && (ev.snapshot?.turnStartedAt ?? 0) > previous.at;
  const otherTurn = !!ev.turnId && !!previous.turnId && ev.turnId !== previous.turnId && !startsTurn;
  if (otherTurn && !requestLifecycle && ev.type !== "snapshot") return null;
  if (ev.source === "notify" && previous.turnId && !ev.turnId && ev.type === "stopped") return null;
  const state = { ...previous, pending: [...previous.pending], resolved: [...previous.resolved] };
  const ids = ev.requestIds ?? [];
  switch (ev.type) {
    case "snapshot": {
      const observed = ev.snapshot;
      if (ev.snapshotComplete && !prev?.state) state.pending = [];
      if (!observed) return null;
      state.resolved = [.../* @__PURE__ */ new Set([...state.resolved, ...observed.resolved])].slice(-256);
      state.pending = state.pending.filter((request) => !state.resolved.includes(request.id));
      const relevant = observed.pending.filter(
        (request) => (!request.inferred || request.at >= (previous.turnStartedAt ?? 0)) && !state.resolved.includes(request.id)
      );
      if (ev.at < previous.at || otherTurn) {
        for (const request of relevant)
          if (!state.pending.some((r) => r.id === request.id)) state.pending.push(request);
      } else {
        state.phase = observed.phase;
        state.turnId = observed.turnId ?? state.turnId;
        state.turnStartedAt = observed.turnStartedAt ?? state.turnStartedAt;
        state.pending = state.pending.filter(
          (r) => !state.resolved.includes(r.id) && (!r.inferred || r.at >= (observed.turnStartedAt ?? 0))
        );
        for (const request of relevant)
          if (!state.pending.some((r) => r.id === request.id)) state.pending.push(request);
      }
      break;
    }
    case "started":
      break;
    case "progress":
      state.phase = "running";
      state.pending = state.pending.filter((request) => !request.inferred);
      state.turnId = ev.turnId;
      state.turnStartedAt = ev.at;
      break;
    case "tool":
    case "resolved": {
      const matched = state.pending.filter((request) => ids.includes(request.id));
      state.pending = state.pending.filter((request) => !ids.includes(request.id));
      state.resolved = [.../* @__PURE__ */ new Set([...state.resolved, ...ids])].slice(-256);
      if (ev.type === "tool" && ev.at >= previous.at && (!ev.turnId || !previous.turnId || ev.turnId === previous.turnId))
        state.phase = "running";
      else if (!matched.length && !ids.length) return null;
      break;
    }
    case "needs_input":
    case "failed":
    case "quota":
    case "interrupted": {
      const attention2 = ev.type === "needs_input" ? ev.attention ?? "input" : ev.type;
      const samePrompt = (other) => other === attention2 || ["input", "question", "permission"].includes(attention2) && ["input", "question", "permission"].includes(other);
      if (!ids.length && state.pending.some((request) => !request.inferred && samePrompt(request.attention))) break;
      if (ids.length)
        state.pending = state.pending.filter((request) => !request.inferred || !samePrompt(request.attention));
      const requestIds2 = ids.length ? ids : [`hint:${attention2}`];
      for (const id of requestIds2) {
        if (state.resolved.includes(id) || state.pending.some((request) => request.id === id)) continue;
        state.pending.push({ id, attention: attention2, at: ev.at, turnId: ev.turnId, inferred: ev.inferred ?? !ids.length });
      }
      if (ev.type !== "needs_input") state.phase = "unknown";
      break;
    }
    case "stopped":
      state.phase = "ready";
      if (ev.attention === "question" && state.pending.length === 0) {
        state.pending.push({
          id: "hint:question",
          attention: "question",
          at: ev.at,
          turnId: ev.turnId,
          inferred: true
        });
      }
      break;
    case "completed":
      state.phase = "done";
      break;
    case "ended":
      if (state.phase === "running") state.phase = "unknown";
      break;
  }
  state.at = Math.max(previous.at, ev.at);
  state.source = ev.source ?? "external";
  if (!state.turnId && ev.turnId && ev.at >= previous.at) state.turnId = ev.turnId;
  const pending = [...state.pending].sort((a, b) => priority(b) - priority(a) || b.at - a.at);
  const status = pending.length ? "needs_input" : state.phase;
  const attention = pending[0]?.attention ?? null;
  const base = prev ?? {
    agent: ev.agent,
    sessionId: ev.sessionId,
    host: ev.host ?? "cli",
    title: "",
    cwd: ev.cwd ?? "",
    status: "idle",
    attention: null,
    summary: "",
    locator: {},
    subscribed: false,
    handledAt: null,
    startedAt: ev.at,
    updatedAt: ev.at,
    transcriptPath: ""
  };
  const newRequest = state.pending.some(
    (r) => !previous.pending.some((p) => p.id === r.id || p.inferred && p.attention === r.attention)
  );
  const statusChanged = base.status !== status || base.attention !== attention || newRequest;
  const next = {
    ...base,
    host: ev.host ?? base.host,
    cwd: ev.cwd || base.cwd,
    title: base.title || toTitle(ev.title),
    summary: ev.summary ? lastSentence(ev.summary) : base.summary,
    status,
    attention,
    state,
    locator: ev.type === "ended" ? releaseTerminal(base.locator) : ev.at >= previous.at && ev.locator ? { ...base.locator, ...stripEmpty(ev.locator), ...ev.locator.tty ? { observedAt: ev.at } : {} } : base.locator,
    transcriptPath: ev.transcriptPath || base.transcriptPath,
    handledAt: statusChanged ? null : base.handledAt,
    updatedAt: Math.max(base.updatedAt, ev.at)
  };
  return { next, notify: next.subscribed && status === "needs_input" && statusChanged, changed: true };
}
function priority(request) {
  return request.attention === "permission" ? 3 : request.inferred ? 1 : 2;
}
function stripEmpty(o) {
  if (!o) return {};
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== void 0 && v !== null && v !== "") out[k] = v;
  }
  return out;
}

// src/core/sources/collector.ts
var WINDOW = 512 * 1024;
var MAX_BATCH = 1024 * 1024;
function readTranscriptBatch(path, previous, fromStart = false, recovery = false) {
  const stat = statSync2(path);
  if (!stat.isFile()) throw new Error("Transcript is not a regular file");
  const identity = `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
  const reset = !previous || previous.identity !== identity || stat.size < previous.offset || recovery && previous.bootstrapping && previous.bootstrapEnd !== void 0 && stat.size < previous.bootstrapEnd || stat.size === previous.offset && stat.mtimeMs !== previous.mtime;
  const start = reset ? fromStart ? 0 : Math.max(0, stat.size - WINDOW) : previous.offset;
  const cursor = {
    identity,
    offset: start,
    context: reset ? {} : { ...previous.context },
    skipping: reset ? start > 0 : previous.skipping,
    mtime: stat.mtimeMs,
    bootstrapping: reset || previous?.bootstrapping,
    snapshot: reset ? void 0 : previous?.snapshot,
    bootstrapEnd: reset ? recovery ? stat.size : void 0 : previous?.bootstrapEnd ?? (previous?.bootstrapping && recovery ? stat.size : void 0)
  };
  const end = recovery && cursor.bootstrapping && cursor.bootstrapEnd !== void 0 ? cursor.bootstrapEnd : stat.size;
  const fd = openSync(path, "r");
  const records = [];
  try {
    const buffer = Buffer.alloc(Math.min(MAX_BATCH, end - start));
    const length = readSync(fd, buffer, 0, buffer.length, start);
    let from = 0;
    for (let index = 0; index < length; index++) {
      if (buffer[index] !== 10) continue;
      if (!cursor.skipping) {
        try {
          const entry = JSON.parse(buffer.subarray(from, index).toString("utf8"));
          if (entry && typeof entry === "object" && !Array.isArray(entry))
            records.push({ entry, offset: start + from });
        } catch {
        }
      }
      cursor.skipping = false;
      from = index + 1;
      cursor.offset = start + from;
    }
    if (!cursor.skipping && from < length && start + length === end) {
      try {
        const entry = JSON.parse(buffer.subarray(from, length).toString("utf8"));
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          records.push({ entry, offset: start + from });
          cursor.offset = end;
          from = length;
        }
      } catch {
      }
    }
    if (from === 0 && length === MAX_BATCH) {
      cursor.offset = start + length;
      cursor.skipping = true;
    }
    if (cursor.skipping && from === 0 && start + length === end) cursor.offset = end;
  } finally {
    closeSync(fd);
  }
  const atBootstrapEnd = end - start <= MAX_BATCH;
  return { records, cursor, reset, atEnd: cursor.offset === stat.size, atBootstrapEnd };
}
var TranscriptCollector = class {
  constructor(engine, adapters, onError = () => {
  }) {
    this.engine = engine;
    this.adapters = adapters;
    this.onError = onError;
  }
  engine;
  adapters;
  onError;
  lookups = /* @__PURE__ */ new Map();
  async poll() {
    const adapters = new Map(this.adapters().map((adapter) => [adapter.id, adapter]));
    for (const session of await this.engine.store.subscribed()) {
      const adapter = adapters.get(session.agent);
      const source2 = adapter?.source?.transcript;
      if (!source2) continue;
      const key2 = `${session.agent}:${session.sessionId}`;
      try {
        let path = session.transcriptPath;
        if (!path || !readable(path)) {
          if (Date.now() - (this.lookups.get(key2) ?? 0) < 3e4) continue;
          this.lookups.set(key2, Date.now());
          path = await adapter?.source?.locateTranscript?.(session) ?? "";
        }
        if (!path) continue;
        if (path !== session.transcriptPath)
          await this.engine.store.attachTranscript(session.agent, session.sessionId, path);
        const cursorKey = `transcript:v2:${key2}:${path}`;
        let previous = await this.engine.store.readCursor(cursorKey);
        for (let chunk = 0; chunk < 32; chunk++) {
          const batch = readTranscriptBatch(path, previous, true, true);
          let snapshot = batch.cursor.snapshot;
          for (const { entry, offset } of batch.records) {
            for (const [index, event2] of source2.parse(entry, session, batch.cursor.context).entries()) {
              const normalized = {
                ...event2,
                transcriptPath: path,
                eventId: createHash("sha256").update(`${cursorKey}:${batch.cursor.identity}:${offset}:${index}:${JSON.stringify(entry)}`).digest("hex")
              };
              if (batch.cursor.bootstrapping) snapshot = applyEvent(snapshot, normalized)?.next ?? snapshot;
              else await this.engine.ingest(normalized);
            }
          }
          if (batch.cursor.bootstrapping && batch.atBootstrapEnd) {
            if (snapshot?.state)
              await this.engine.ingest(
                {
                  agent: session.agent,
                  sessionId: session.sessionId,
                  type: "snapshot",
                  snapshot: snapshot.state,
                  snapshotComplete: true,
                  host: session.host === "app" ? "app" : snapshot.host,
                  at: snapshot.state.at,
                  turnId: snapshot.state.turnId,
                  source: "transcript",
                  transcriptPath: path,
                  summary: snapshot.summary,
                  eventId: `snapshot:${cursorKey}:${batch.cursor.identity}:${batch.cursor.offset}:${batch.cursor.mtime}`
                },
                { silent: true }
              );
            batch.cursor.bootstrapping = false;
            batch.cursor.snapshot = void 0;
            batch.cursor.bootstrapEnd = void 0;
          } else if (batch.cursor.bootstrapping) batch.cursor.snapshot = snapshot;
          await this.engine.store.writeCursor(cursorKey, batch.cursor);
          const advanced = batch.cursor.offset !== previous?.offset;
          previous = batch.cursor;
          if (batch.atEnd || !advanced) break;
        }
      } catch (error) {
        this.onError(`collector ${key2}: ${String(error)}`);
      }
    }
  }
};
function readable(path) {
  try {
    return statSync2(path).isFile();
  } catch {
    return false;
  }
}

// src/core/sources/claude-titles.ts
function readClaudeTitleFile(session) {
  if (!session.transcriptPath || basename(session.transcriptPath) !== `${session.sessionId}.jsonl`) return void 0;
  try {
    const path = join4(dirname(session.transcriptPath), session.sessionId, "custom-title.json");
    if (statSync3(path).size > 64 * 1024) return {};
    const value = JSON.parse(readFileSync2(path, "utf8"));
    return typeof value.customTitle === "string" && value.customTitle.trim() ? { title: value.customTitle } : {};
  } catch (error) {
    return error.code === "ENOENT" ? void 0 : {};
  }
}
var ClaudeTitleSource = class {
  constructor(io = { desktop: readClaudeDesktopSessions, windows: readClaudeTitleWindows, now: Date.now }) {
    this.io = io;
  }
  io;
  legacy = /* @__PURE__ */ new Map();
  sidecars = /* @__PURE__ */ new Set();
  next = 0;
  async read(sessions) {
    const observedAt = this.io.now();
    const desktop = this.io.desktop();
    const titles = [];
    const legacy = [];
    const cloud = [];
    const add = (session, title, source2) => titles.push({ agent: session.agent, sessionId: session.sessionId, title, observedAt, source: source2 });
    for (const session of sessions) {
      const local = findClaudeDesktopSession(session.sessionId, desktop);
      if (local?.title && !hasClaudeTerminalLocator(session)) add(session, local.title, "claude-desktop");
      else {
        if (session.locator.claudeDesktopId && !hasClaudeTerminalLocator(session)) continue;
        const custom = readClaudeTitleFile(session);
        if (custom) {
          this.sidecars.add(session.transcriptPath);
          if (custom.title) add(session, custom.title, "claude-title-file");
        } else if (this.sidecars.has(session.transcriptPath) || session.titleSource === "claude-title-file") continue;
        else if (session.transcriptPath && basename(session.transcriptPath) === `${session.sessionId}.jsonl`)
          legacy.push(session);
        else if (session.host === "app" && CLAUDE_BRIDGE_ID.test(session.sessionId) && !local && !desktop.some((r) => r.bridgeSessionIds?.some((id) => sameClaudeBridgeId(id, session.sessionId))))
          cloud.push(session);
      }
    }
    let budget = 16;
    for (let i = 0; i < legacy.length; i++) {
      const session = legacy[(this.next + i) % legacy.length];
      const path = session.transcriptPath;
      let cached2 = this.legacy.get(path);
      try {
        const stat = statSync3(path);
        const unchanged = cached2 && cached2.cursor.offset === stat.size && cached2.cursor.mtime === stat.mtimeMs && cached2.cursor.identity === `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
        if (!unchanged) {
          if (budget-- <= 0) continue;
          const batch = readTranscriptBatch(path, cached2?.cursor, true);
          cached2 = { cursor: batch.cursor, ...batch.reset ? {} : { title: cached2?.title, custom: cached2?.custom } };
          for (const { entry } of batch.records) {
            if (entry.sessionId && entry.sessionId !== session.sessionId) continue;
            const title = entry.type === "custom-title" ? entry.customTitle : entry.type === "ai-title" ? entry.title : void 0;
            if (typeof title !== "string" || !title.trim()) continue;
            if (entry.type === "custom-title" || !cached2.custom) {
              cached2.title = title;
              cached2.custom = entry.type === "custom-title";
            }
          }
          this.legacy.set(path, cached2);
          if (!batch.atEnd) continue;
        }
        if (cached2?.title) add(session, cached2.title, "claude-transcript-title");
      } catch {
      }
    }
    if (legacy.length) this.next = (this.next + 16) % legacy.length;
    if (cloud.length) {
      let windows = [];
      try {
        windows = await this.io.windows();
      } catch {
      }
      const identities = windows.map(claudeWindowIdentity).filter((v) => v?.title);
      for (const session of cloud) {
        const names = new Set(
          identities.filter((v) => v && sameClaudeBridgeId(v.sessionId, session.sessionId)).map((v) => v.title)
        );
        if (names.size === 1) add(session, [...names][0], "claude-cloud-window");
      }
    }
    return titles;
  }
};
var source = new ClaudeTitleSource();
var readClaudeTitles = (sessions) => source.read(sessions);

// src/core/adapters/events.ts
var string = (value) => typeof value === "string" ? value : "";
var object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function eventTime(value, fallback) {
  const parsed = typeof value === "number" ? value : Date.parse(string(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function hookIdentity(payload, now) {
  return {
    source: "hook",
    at: eventTime(payload.timestamp, now),
    turnId: string(payload.turn_id) || void 0,
    eventId: string(payload.event_id) || void 0
  };
}
function requestIds(payload) {
  const id = string(payload.tool_use_id) || string(payload.call_id) || string(payload.request_id);
  return id ? [id] : [];
}
function questionTool(name) {
  return /(?:^|[._])(?:AskUserQuestion|request_user_input(?:_async)?|AskUser)(?:$)/i.test(name);
}
function isAsyncAcknowledgement(value) {
  let output = value;
  if (typeof output === "string") {
    try {
      output = JSON.parse(output);
    } catch {
      return false;
    }
  }
  return object(output).accepted === true && !object(output).answers;
}

// src/core/sources/transcripts.ts
function messageText(value) {
  if (typeof value === "string") return value;
  return Array.isArray(value) ? value.map((item) => string(object(item).text)).filter(Boolean).join("\n") : "";
}
function json(value) {
  if (typeof value !== "string") return object(value);
  try {
    return object(JSON.parse(value));
  } catch {
    return {};
  }
}
function questionIds(callId, name, input) {
  if (!callId) return [];
  const questions = json(input).questions;
  return /request_user_input_async$/.test(name) && Array.isArray(questions) && questions.length ? questions.map((_, index) => `${callId}:${index}`) : [callId];
}
function asyncReplyIds(text2) {
  const ids = [];
  for (const match of text2.matchAll(
    /<send_user_message_question_reply>([\s\S]*?)<\/send_user_message_question_reply>/g
  )) {
    try {
      const answers = JSON.parse(match[1]);
      if (!Array.isArray(answers)) continue;
      for (const answer of answers) {
        const identity = JSON.parse(string(object(answer).questionItemId));
        if (Array.isArray(identity) && identity[0] === "request_user_input_async" && typeof identity[1] === "string" && Number.isInteger(identity[2]))
          ids.push(`${identity[1]}:${identity[2]}`);
      }
    } catch {
    }
  }
  return ids;
}
var codexTranscript = {
  parse(entry, session, context) {
    const payload = object(entry.payload);
    const at = eventTime(entry.timestamp, 0);
    if (!at) return [];
    const metadata = object(payload.internal_chat_message_metadata_passthrough);
    const turnId = string(payload.turn_id) || string(metadata.turn_id) || context.turnId;
    const base = { agent: session.agent, sessionId: session.sessionId, at, source: "transcript", turnId };
    const event2 = (type, extra = {}) => [
      { ...base, type, ...extra }
    ];
    if (entry.type === "session_meta") {
      if (string(payload.id) && payload.id !== session.sessionId)
        throw new Error("Transcript session identity mismatch");
      const origin = string(payload.originator) || string(payload.source);
      return event2("started", {
        cwd: string(payload.cwd),
        host: /desktop|codex_app|chatgpt/i.test(origin) ? "app" : "cli"
      });
    }
    if (entry.type === "turn_context") {
      context.turnId = string(payload.turn_id) || context.turnId;
      return [];
    }
    if (entry.type === "event_msg") {
      if (payload.type === "task_started") {
        context.turnId = turnId;
        return event2("progress");
      }
      if (payload.type === "task_complete") {
        const summary = string(payload.last_agent_message);
        return event2("stopped", { summary, attention: asksForInput(summary) ? "question" : void 0 });
      }
      if (payload.type === "turn_aborted") return event2("interrupted", { summary: string(payload.reason) });
      if (payload.type === "error")
        return event2(/quota|usage.limit|rate.limit/i.test(string(payload.message)) ? "quota" : "failed", {
          summary: string(payload.message)
        });
      if (payload.type === "user_message") {
        const message = string(payload.message);
        const replies = asyncReplyIds(message);
        return replies.length ? event2("resolved", { requestIds: replies }) : event2("progress", { title: message });
      }
    }
    if (entry.type !== "response_item") return [];
    if ((payload.type === "function_call" || payload.type === "custom_tool_call") && questionTool(string(payload.name))) {
      const ids = questionIds(string(payload.call_id), string(payload.name), payload.arguments ?? payload.input);
      if (/request_user_input_async$/.test(string(payload.name))) {
        context.asyncRequests ??= {};
        context.asyncRequests[string(payload.call_id)] = ids;
      }
      return event2("needs_input", { attention: "question", requestIds: ids });
    }
    if (payload.type === "function_call" || payload.type === "custom_tool_call") return event2("tool");
    if (payload.type === "function_call_output" || payload.type === "custom_tool_call_output") {
      if (isAsyncAcknowledgement(payload.output)) return [];
      const asyncIds = context.asyncRequests?.[string(payload.call_id)];
      if (asyncIds) {
        const output = json(payload.output);
        if (output.accepted !== false && !output.error && !output.isError) return [];
        delete context.asyncRequests[string(payload.call_id)];
        return event2("resolved", { requestIds: asyncIds });
      }
      return event2("resolved", { requestIds: string(payload.call_id) ? [string(payload.call_id)] : [] });
    }
    if (payload.type === "message" && payload.role === "user") {
      const replies = asyncReplyIds(messageText(payload.content));
      return replies.length ? event2("resolved", { requestIds: replies }) : [];
    }
    return [];
  }
};
var claudeTranscript = {
  parse(entry, session, context) {
    const at = eventTime(entry.timestamp, 0);
    if (!at || entry.isSidechain === true) return [];
    const base = {
      agent: session.agent,
      sessionId: session.sessionId,
      at,
      source: "transcript",
      turnId: context.turnId
    };
    const message = object(entry.message);
    const content = Array.isArray(message.content) ? message.content.map(object) : [];
    const events = [];
    if (entry.type === "user") {
      for (const item of content)
        if (item.type === "tool_result" && string(item.tool_use_id))
          events.push({ ...base, type: "tool", requestIds: [string(item.tool_use_id)] });
      if (!events.length && !entry.isMeta)
        events.push({ ...base, type: "progress", title: messageText(message.content) });
    }
    if (entry.type === "assistant") {
      for (const item of content)
        if (item.type === "tool_use") {
          events.push({
            ...base,
            type: questionTool(string(item.name)) ? "needs_input" : "tool",
            attention: questionTool(string(item.name)) ? "question" : void 0,
            requestIds: questionTool(string(item.name)) && string(item.id) ? [string(item.id)] : []
          });
        }
      if (message.stop_reason === "end_turn" || entry.stop_reason === "end_turn") {
        const summary = messageText(message.content);
        events.push({ ...base, type: "stopped", summary, attention: asksForInput(summary) ? "question" : void 0 });
      }
    }
    return events;
  }
};

// src/core/adapters/claude.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "node:fs";

// src/core/terminal.ts
import { existsSync } from "node:fs";
var TERMINAL_BUNDLE = "com.apple.Terminal";
var ITERM_BUNDLE = "com.googlecode.iterm2";
var GHOSTTY_BUNDLE = "com.mitchellh.ghostty";
var TERM_PROGRAM_BUNDLES = {
  Apple_Terminal: TERMINAL_BUNDLE,
  "iTerm.app": ITERM_BUNDLE,
  ghostty: GHOSTTY_BUNDLE,
  WezTerm: "com.github.wez.wezterm",
  vscode: "com.microsoft.VSCode",
  WarpTerminal: "dev.warp.Warp-Stable"
};
function bundleFor(loc) {
  if (loc.bundleId) return loc.bundleId;
  if (loc.termProgram && TERM_PROGRAM_BUNDLES[loc.termProgram]) return TERM_PROGRAM_BUNDLES[loc.termProgram];
  return void 0;
}
function tmuxBinary() {
  for (const p of ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"]) if (existsSync(p)) return p;
  return "tmux";
}
function tmuxArgs(loc, args) {
  return loc.tmuxSocket ? ["-S", loc.tmuxSocket, ...args] : args;
}
async function tmuxPaneAlive(loc) {
  if (!loc.tmuxPane) return false;
  const r = await run(tmuxBinary(), tmuxArgs(loc, ["display-message", "-p", "-t", loc.tmuxPane, "#{pane_id}"]));
  return r.ok && r.stdout.trim() === loc.tmuxPane;
}
async function focusTmuxPane(loc, actions = { run, activateBundle }) {
  if (!loc.tmuxPane) return false;
  const tmux = tmuxBinary();
  const pane = loc.tmuxPane;
  const switched = await actions.run(tmux, tmuxArgs(loc, ["switch-client", "-t", pane]));
  const window = await actions.run(tmux, tmuxArgs(loc, ["select-window", "-t", pane]));
  const selected = await actions.run(tmux, tmuxArgs(loc, ["select-pane", "-t", pane]));
  const bundle = bundleFor(loc);
  const activated = bundle && bundle !== "tmux" ? await actions.activateBundle(bundle) : false;
  return window.ok && selected.ok && (switched.ok || activated);
}
async function activateBundle(bundleId) {
  const r = await run("/usr/bin/open", ["-b", bundleId]);
  return r.ok;
}
async function focusTty(tty, bundleId, actions = { osascript }) {
  if (bundleId === TERMINAL_BUNDLE) {
    const r = await actions.osascript(
      `
on run argv
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is (item 1 of argv) then
        set selected of t to true
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "miss"
end run`,
      "AppleScript",
      [tty]
    );
    return r.ok && r.stdout.trim() === "ok";
  }
  if (bundleId === ITERM_BUNDLE) {
    const r = await actions.osascript(
      `
on run argv
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is (item 1 of argv) then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "miss"
end run`,
      "AppleScript",
      [tty]
    );
    return r.ok && r.stdout.trim() === "ok";
  }
  if (bundleId === GHOSTTY_BUNDLE) {
    const r = await actions.osascript(
      `
on run argv
tell application "Ghostty"
  repeat with term in terminals
    if tty of term is (item 1 of argv) then
      focus term
      return "ok"
    end if
  end repeat
end tell
return "miss"
end run`,
      "AppleScript",
      [tty]
    );
    return r.ok && r.stdout.trim() === "ok";
  }
  return false;
}
async function openInTerminal(command, cwd, terminal, actions = { run, osascript }) {
  const line = cwd && existsSync(cwd) ? `cd ${shQuote(cwd)} && ${command}` : command;
  if (terminal === "iterm") {
    const r2 = await actions.osascript(
      `
on run argv
tell application "iTerm2"
  activate
  set w to (create window with default profile)
  tell current session of w to write text (item 1 of argv)
end tell
end run`,
      "AppleScript",
      [line]
    );
    if (r2.ok) return true;
  }
  if (terminal === "ghostty") {
    const args = ["-na", "Ghostty", "--args"];
    if (cwd && existsSync(cwd)) args.push(`--working-directory=${cwd}`);
    args.push("-e", process.env.SHELL || "/bin/zsh", "-lc", command);
    const r2 = await actions.run("/usr/bin/open", args);
    if (r2.ok) return true;
  }
  const r = await actions.osascript(
    `
on run argv
tell application "Terminal"
  activate
  do script (item 1 of argv)
end tell
end run`,
    "AppleScript",
    [line]
  );
  return r.ok;
}

// src/core/sqlite.ts
import { existsSync as existsSync2, mkdirSync } from "node:fs";
import { dirname as dirname2 } from "node:path";
function sqliteBinary() {
  if (process.env.AGENT_INBOX_SQLITE) return process.env.AGENT_INBOX_SQLITE;
  for (const p of ["/usr/bin/sqlite3", "/opt/homebrew/bin/sqlite3", "/usr/local/bin/sqlite3"]) {
    if (existsSync2(p)) return p;
  }
  return "sqlite3";
}
function q(v) {
  if (v === null || v === void 0) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.trunc(v)) : "NULL";
  return "'" + String(v).split("\0").join("").replace(/'/g, "''") + "'";
}
var SqliteError = class extends Error {
};
async function exec(dbPath, statements) {
  if (!existsSync2(dirname2(dbPath))) mkdirSync(dirname2(dbPath), { recursive: true });
  const res = await run(sqliteBinary(), ["-json", "-bail", "-cmd", ".timeout 4000", dbPath], statements, 1e4);
  if (!res.ok) throw new SqliteError(res.stderr.trim() || "sqlite3 failed");
  const out = res.stdout.trim();
  if (!out) return [];
  try {
    return JSON.parse(out);
  } catch {
    throw new SqliteError("Unexpected sqlite3 output: " + out.slice(0, 200));
  }
}

// src/core/db.ts
var SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'cli',
  title TEXT NOT NULL DEFAULT '',
  cwd TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle',
  attention TEXT,
  summary TEXT NOT NULL DEFAULT '',
  locator TEXT NOT NULL DEFAULT '{}',
  subscribed INTEGER NOT NULL DEFAULT 0,
  handled_at INTEGER,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  transcript_path TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (agent, session_id)
);
CREATE INDEX IF NOT EXISTS sessions_updated ON sessions(updated_at DESC);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_session ON events(agent, session_id, at DESC);
CREATE TABLE IF NOT EXISTS event_receipts (agent TEXT, session_id TEXT, event_key TEXT, PRIMARY KEY(agent, session_id, event_key));
CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT NOT NULL, channel TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(id, channel)
);
CREATE TABLE IF NOT EXISTS source_cursors (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS session_titles (
  agent TEXT NOT NULL, session_id TEXT NOT NULL, title TEXT NOT NULL,
  observed_at INTEGER NOT NULL, source TEXT NOT NULL, PRIMARY KEY(agent,session_id)
);
`;
var COLUMNS = "agent, session_id, host, title, cwd, status, attention, summary, locator, subscribed, handled_at, started_at, updated_at, transcript_path, state, revision";
var READ_SESSIONS = `SELECT ${COLUMNS.split(", ").map((column) => column === "title" ? "COALESCE(t.title,s.title) AS title" : `s.${column}`).join(", ")},
  t.observed_at AS title_observed_at, t.source AS title_source FROM sessions s LEFT JOIN session_titles t ON s.agent=t.agent AND s.session_id=t.session_id`;
function fromRow(r) {
  let locator = {};
  try {
    locator = JSON.parse(r.locator || "{}");
  } catch {
    locator = {};
  }
  return {
    agent: r.agent,
    sessionId: r.session_id,
    host: r.host === "app" ? "app" : "cli",
    title: r.title ?? "",
    ...r.title_observed_at != null ? { titleObservedAt: r.title_observed_at } : {},
    ...r.title_source ? { titleSource: r.title_source } : {},
    cwd: r.cwd ?? "",
    status: r.status,
    attention: r.attention ?? null,
    summary: r.summary ?? "",
    locator,
    subscribed: r.subscribed === 1,
    handledAt: r.handled_at ?? null,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    transcriptPath: r.transcript_path ?? "",
    state: parseState(r.state),
    revision: r.revision ?? 0
  };
}
function parseState(value) {
  try {
    const state = JSON.parse(value);
    return state && typeof state.at === "number" && Array.isArray(state.pending) && Array.isArray(state.resolved) ? state : void 0;
  } catch {
    return void 0;
  }
}
function values(s3) {
  return [
    q(s3.agent),
    q(s3.sessionId),
    q(s3.host),
    q(s3.title),
    q(s3.cwd),
    q(s3.status),
    q(s3.attention),
    q(s3.summary),
    q(JSON.stringify(s3.locator ?? {})),
    q(s3.subscribed),
    q(s3.handledAt),
    q(s3.startedAt),
    q(s3.updatedAt),
    q(s3.transcriptPath),
    q(JSON.stringify(s3.state ?? {})),
    q(s3.revision ?? 0)
  ].join(", ");
}
var Store = class {
  constructor(path = DB_PATH) {
    this.path = path;
  }
  path;
  ready = null;
  init() {
    if (!this.ready) {
      this.ready = this.initialize();
      this.ready.catch(() => this.ready = null);
    }
    return this.ready;
  }
  async initialize() {
    await exec(this.path, "PRAGMA journal_mode=WAL;");
    await exec(this.path, SCHEMA);
    for (const [name, declaration] of [
      ["state", "TEXT NOT NULL DEFAULT '{}'"],
      ["revision", "INTEGER NOT NULL DEFAULT 0"]
    ]) {
      const columns = await exec(this.path, "PRAGMA table_info(sessions);");
      if (columns.some((column) => column.name === name)) continue;
      try {
        await exec(this.path, `ALTER TABLE sessions ADD COLUMN ${name} ${declaration};`);
      } catch (error) {
        const current = await exec(this.path, "PRAGMA table_info(sessions);");
        if (!current.some((column) => column.name === name)) throw error;
      }
    }
    await exec(
      this.path,
      "UPDATE sessions SET status='ready', revision=revision+1 WHERE agent IN ('claude','codex') AND status='done' AND state='{}';"
    );
  }
  async run(sql) {
    await this.init();
    return exec(this.path, sql);
  }
  async get(agent, sessionId) {
    const rows = await this.run(`${READ_SESSIONS} WHERE s.agent=${q(agent)} AND s.session_id=${q(sessionId)};`);
    return rows[0] ? fromRow(rows[0]) : void 0;
  }
  async all(limit = 500) {
    const rows = await this.run(`${READ_SESSIONS} ORDER BY s.updated_at DESC LIMIT ${q(limit)};`);
    return rows.map(fromRow);
  }
  /** Rows that can appear in the inbox or the menu bar. */
  async active() {
    const rows = await this.run(
      `${READ_SESSIONS} WHERE s.subscribed=1 AND s.handled_at IS NULL ORDER BY s.updated_at DESC;`
    );
    return rows.map(fromRow);
  }
  async put(s3) {
    await this.run(
      `INSERT INTO sessions (${COLUMNS}) VALUES (${values(s3)}) ON CONFLICT(agent,session_id) DO UPDATE SET (${COLUMNS})=(${values(s3)}), revision=sessions.revision+1;`
    );
  }
  /** Apply an adapter event through the state machine and persist it. */
  async record(ev, options = {}) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const prev = await this.get(ev.agent, ev.sessionId);
      const receipt = `agent=${q(ev.agent)} AND session_id=${q(ev.sessionId)} AND event_key=${q(ev.eventId)}`;
      if (ev.eventId && (await this.run(`SELECT 1 FROM event_receipts WHERE ${receipt};`)).length) return null;
      const t = applyEvent(prev, ev);
      if (!t) return null;
      t.next.revision = (prev?.revision ?? -1) + 1;
      const allowed = ev.eventId ? ` AND NOT EXISTS (SELECT 1 FROM event_receipts WHERE ${receipt})` : "";
      const write = prev ? `UPDATE sessions SET (${COLUMNS})=(${values(t.next)}) WHERE agent=${q(ev.agent)} AND session_id=${q(ev.sessionId)} AND revision=${q(prev.revision ?? 0)}${allowed};` : `INSERT OR IGNORE INTO sessions (${COLUMNS}) SELECT ${values(t.next)} WHERE 1${allowed};`;
      const loc = t.next.locator;
      const sameLocation = loc.tmuxPane && loc.tmuxSocket ? `json_extract(locator,'$.tmuxPane')=${q(loc.tmuxPane)} AND json_extract(locator,'$.tmuxSocket')=${q(loc.tmuxSocket)}` : `json_extract(locator,'$.tty')=${q(loc.tty)}`;
      const stripped = `json_remove(locator,${TERMINAL_LOCATOR_KEYS.map((key2) => q(`$.${key2}`)).join(",")})`;
      const ownership = ev.locator?.tty && loc.tty && loc.observedAt === ev.at ? `UPDATE sessions SET locator=${stripped}, revision=revision+1
           WHERE (SELECT n FROM applied)=1 AND (${sameLocation})
           AND COALESCE(json_extract(locator,'$.observedAt'),0)<${q(ev.at)};
           UPDATE sessions SET locator=${stripped}, revision=revision+1
           WHERE (SELECT n FROM applied)=1 AND agent=${q(ev.agent)} AND session_id=${q(ev.sessionId)}
           AND EXISTS (SELECT 1 FROM sessions WHERE (${sameLocation}) AND COALESCE(json_extract(locator,'$.observedAt'),0)>${q(ev.at)});` : "";
      const notificationId = `${ev.agent}:${ev.sessionId}:${t.next.revision}`;
      const enqueue = t.notify && !options.silent ? [...new Set(options.channels ?? [])].map(
        (channel) => `INSERT OR IGNORE INTO notification_outbox (id,channel,payload) SELECT ${q(notificationId)},${q(channel)},${q(JSON.stringify(t.next))} WHERE (SELECT n FROM applied)=1;`
      ).join("") : "";
      const result = await this.run(
        `BEGIN IMMEDIATE; ${write} CREATE TEMP TABLE applied AS SELECT changes() AS n;INSERT INTO events (agent,session_id,type,summary,at) SELECT ${q(ev.agent)},${q(ev.sessionId)},${q(ev.type)},${q(t.next.summary)},${q(ev.at)} WHERE (SELECT n FROM applied)=1;` + (ev.eventId ? `INSERT OR IGNORE INTO event_receipts SELECT ${q(ev.agent)},${q(ev.sessionId)},${q(ev.eventId)} WHERE (SELECT n FROM applied)=1;` : "") + enqueue + ownership + `DELETE FROM events WHERE at < ${q(ev.at - 30 * 24 * 3600 * 1e3)}; SELECT n FROM applied; COMMIT;`
      );
      if (result[0]?.n === 1) return t;
    }
    throw new Error("Concurrent session updates did not settle; event was not recorded");
  }
  async subscribed() {
    return (await this.run(`${READ_SESSIONS} WHERE s.subscribed=1;`)).map(fromRow);
  }
  /** Metadata never changes state, activity, subscription or notification receipts. */
  async syncTitles(observations) {
    const valid = observations.filter((o) => o.title.trim() && Number.isFinite(o.observedAt) && o.observedAt >= 0);
    if (!valid.length) return [];
    if (valid.length > 200) {
      const saved = [];
      for (let index = 0; index < valid.length; index += 200)
        saved.push(...await this.syncTitles(valid.slice(index, index + 200)));
      return saved;
    }
    const writes = valid.map(
      (o) => `INSERT INTO session_titles (agent,session_id,title,observed_at,source)
       SELECT ${q(o.agent)},${q(o.sessionId)},${q(o.title)},${q(o.observedAt)},${q(o.source)}
       WHERE EXISTS (SELECT 1 FROM sessions WHERE agent=${q(o.agent)} AND session_id=${q(o.sessionId)})
       ON CONFLICT(agent,session_id) DO UPDATE SET title=excluded.title,observed_at=excluded.observed_at,source=excluded.source
       WHERE excluded.observed_at>session_titles.observed_at;`
    ).join("\n");
    const where = valid.map((o) => `(agent=${q(o.agent)} AND session_id=${q(o.sessionId)})`).join(" OR ");
    return this.run(`BEGIN IMMEDIATE; ${writes}
      SELECT agent,session_id AS sessionId,title,observed_at AS observedAt,source FROM session_titles WHERE ${where}; COMMIT;`);
  }
  async attachTranscript(agent, sessionId, path) {
    await this.run(
      `UPDATE sessions SET transcript_path=${q(path)}, revision=revision+1 WHERE agent=${q(agent)} AND session_id=${q(sessionId)} AND transcript_path<>${q(path)};`
    );
  }
  async readCursor(key2) {
    const rows = await this.run(`SELECT value FROM source_cursors WHERE key=${q(key2)};`);
    return rows[0] ? JSON.parse(rows[0].value) : void 0;
  }
  async writeCursor(key2, value) {
    await this.run(`INSERT OR REPLACE INTO source_cursors VALUES (${q(key2)},${q(JSON.stringify(value))});`);
  }
  async claimNotifications(now = Date.now()) {
    return this.run(
      `UPDATE notification_outbox SET lease_until=${q(now + 6e4)} WHERE rowid IN (SELECT rowid FROM notification_outbox WHERE next_attempt_at<=${q(now)} AND lease_until<=${q(now)} LIMIT 1) RETURNING id,channel,payload,attempts;`
    );
  }
  async finishNotification(job, delivered, now = Date.now()) {
    const where = `id=${q(job.id)} AND channel=${q(job.channel)}`;
    await this.run(
      delivered ? `DELETE FROM notification_outbox WHERE ${where};` : `UPDATE notification_outbox SET attempts=attempts+1,lease_until=0,next_attempt_at=${q(now + Math.min(36e5, 1e3 * 2 ** Math.min(job.attempts, 12)))} WHERE ${where};`
    );
  }
  async setSubscribed(agent, sessionId, subscribed) {
    await this.run(
      `UPDATE sessions SET revision=revision+1, subscribed=${q(subscribed)}${subscribed ? ", handled_at=NULL" : ""} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`
    );
  }
  /** Subscribe to a session that may only exist as a transcript on disk (history). */
  async subscribeEntry(s3, options = {}) {
    const identity = options.focused && s3.host === "app" ? `, host='app', title=CASE WHEN excluded.title<>'' THEN excluded.title ELSE sessions.title END, locator=json_patch(CASE WHEN json_valid(sessions.locator) THEN sessions.locator ELSE '{}' END, ${q(
      JSON.stringify({
        ...s3.locator.hostId ? { hostId: s3.locator.hostId } : {},
        ...s3.locator.claudeDesktopId ? { claudeDesktopId: s3.locator.claudeDesktopId } : {}
      })
    )})` : "";
    await this.run(
      `INSERT INTO sessions (${COLUMNS}) VALUES (${values({ ...s3, subscribed: true, handledAt: null })}) ON CONFLICT(agent, session_id) DO UPDATE SET revision=sessions.revision+1, subscribed=1, handled_at=NULL${identity};`
    );
    if (options.focused && s3.title)
      await this.syncTitles([
        {
          agent: s3.agent,
          sessionId: s3.sessionId,
          title: s3.title,
          observedAt: s3.titleObservedAt ?? Date.now(),
          source: "focused-window"
        }
      ]);
  }
  async markHandled(agent, sessionId, at = Date.now()) {
    await this.run(
      `UPDATE sessions SET revision=revision+1, handled_at=${q(at)} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`
    );
  }
  async unmarkHandled(agent, sessionId) {
    await this.run(
      `UPDATE sessions SET revision=revision+1, handled_at=NULL WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`
    );
  }
  /** "Archive Completed": every finished session leaves the inbox. */
  async archiveDone(at = Date.now(), observed) {
    const snapshots = observed?.filter((s3) => s3.subscribed && s3.handledAt === null && s3.status === "done");
    if (snapshots?.length === 0) return 0;
    const state = snapshots ? `status IN ('idle','done') AND (${snapshots.map((s3) => `(agent=${q(s3.agent)} AND session_id=${q(s3.sessionId)} AND updated_at=${q(s3.updatedAt)})`).join(" OR ")})` : "status='done'";
    const rows = await this.run(
      `UPDATE sessions SET revision=revision+1, handled_at=${q(at)} WHERE subscribed=1 AND ${state} AND handled_at IS NULL; SELECT changes() AS n;`
    );
    return rows[0]?.n ?? 0;
  }
};

// src/core/jump.ts
async function openUrl(url) {
  const r = await run("/usr/bin/open", [url]);
  return r.ok;
}
async function copyToClipboard(text2) {
  const r = await run("/usr/bin/pbcopy", [], text2);
  return r.ok;
}
var cliNavigation = {
  activateBundle,
  bundleFor,
  focusTmuxPane,
  focusTty,
  openInTerminal,
  tmuxPaneAlive,
  terminalOwnerAlive,
  currentSession: (s3) => new Store().get(s3.agent, s3.sessionId)
};
async function jumpToCli(session, resumeCommand, config, navigation = cliNavigation) {
  const current = await navigation.currentSession(session);
  const loc = current?.locator ?? {};
  const alive = await navigation.terminalOwnerAlive(loc);
  if (loc.tmuxPane && await navigation.tmuxPaneAlive(loc) && alive) {
    if (await navigation.focusTmuxPane(loc)) return { ok: true, method: "tmux" };
  }
  if (alive && loc.tty) {
    const bundle = navigation.bundleFor(loc);
    if (await navigation.focusTty(loc.tty, bundle)) return { ok: true, method: "tab" };
    if (bundle && await navigation.activateBundle(bundle)) return { ok: true, method: "activate" };
  }
  const ok = await navigation.openInTerminal(resumeCommand, session.cwd, config.resumeTerminal);
  return { ok, method: "resume" };
}

// src/core/transcript.ts
import { closeSync as closeSync2, openSync as openSync2, readSync as readSync2, statSync as statSync4 } from "node:fs";
function readHeadTail(path, headBytes = 64 * 1024, tailBytes = 48 * 1024) {
  const size = statSync4(path).size;
  const fd = openSync2(path, "r");
  try {
    const headLen = size <= headBytes + tailBytes ? size : Math.min(size, headBytes);
    const hb = Buffer.alloc(headLen);
    readSync2(fd, hb, 0, headLen, 0);
    let head = hb.toString("utf8").split("\n");
    if (headLen < size) head = head.slice(0, -1);
    let tail = [];
    if (size > headLen) {
      const start = Math.max(headLen, size - tailBytes);
      const tb = Buffer.alloc(size - start);
      readSync2(fd, tb, 0, size - start, start);
      tail = tb.toString("utf8").split("\n");
      if (start > headLen) tail = tail.slice(1);
    }
    return { head, tail, size };
  } finally {
    closeSync2(fd);
  }
}
function parseLines(lines) {
  const out = [];
  for (const l of lines) {
    const s3 = l.trim();
    if (!s3 || s3[0] !== "{") continue;
    try {
      out.push(JSON.parse(s3));
    } catch {
    }
  }
  return out;
}
var str = (v) => typeof v === "string" ? v : "";
var obj = (v) => v && typeof v === "object" ? v : {};
function isScaffolding(text2) {
  const t = text2.trimStart();
  return t.length === 0 || t.startsWith("<command-") || t.startsWith("<local-command") || t.startsWith("<system-reminder>") || t.startsWith("<environment_context>") || t.startsWith("<user_instructions>") || t.startsWith("<user-prompt-submit-hook>") || t.startsWith("# AGENTS.md") || t.startsWith("Caveat:") || t.startsWith("[Request interrupted");
}
function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => {
      const o = obj(c);
      const type = str(o.type);
      if (type === "text" || type === "input_text" || type === "output_text") return str(o.text);
      return "";
    }).filter(Boolean).join("\n");
  }
  return "";
}
function ts(v) {
  const n = Date.parse(str(v));
  return Number.isFinite(n) ? n : 0;
}
function parseClaude(head, tail) {
  const info = {
    sessionId: "",
    cwd: "",
    title: "",
    firstPrompt: "",
    lastAssistant: "",
    startedAt: 0,
    entrypoint: "",
    originator: ""
  };
  for (const e of [...head, ...tail]) {
    if (!info.sessionId && str(e.sessionId)) info.sessionId = str(e.sessionId);
    if (!info.cwd && str(e.cwd)) info.cwd = str(e.cwd);
    if (str(e.entrypoint)) info.entrypoint = str(e.entrypoint);
    if (!info.startedAt && e.timestamp) info.startedAt = ts(e.timestamp);
    if (e.type === "user" && !info.firstPrompt && !e.isMeta) {
      const text2 = textOf(obj(e.message).content);
      if (!isScaffolding(text2)) info.firstPrompt = text2;
    }
  }
  for (const e of [...head, ...tail]) {
    if (e.type === "custom-title" && str(e.customTitle)) info.title = str(e.customTitle);
    else if (e.type === "summary" && str(e.summary) && !info.title) info.title = str(e.summary);
    else if (e.type === "ai-title" && str(e.title) && !info.title) info.title = str(e.title);
  }
  for (let i = tail.length - 1; i >= 0 && !info.lastAssistant; i--) {
    const e = tail[i];
    if (e.type === "assistant") info.lastAssistant = textOf(obj(e.message).content);
  }
  if (!info.lastAssistant) {
    for (let i = head.length - 1; i >= 0 && !info.lastAssistant; i--) {
      if (head[i].type === "assistant") info.lastAssistant = textOf(obj(head[i].message).content);
    }
  }
  return info;
}
function lastClaudeAssistant(path) {
  try {
    const { head, tail } = readHeadTail(path, 0, 96 * 1024);
    return parseClaude(parseLines(head), parseLines(tail)).lastAssistant;
  } catch {
    return "";
  }
}

// src/core/adapters/types.ts
var HOOK_MARKER = "agent-inbox.mjs";

// src/core/adapters/json.ts
function parseJsonFile(text2, path) {
  if (!text2.trim()) return {};
  try {
    const v = JSON.parse(text2);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  throw new Error(`${path} is not valid JSON; fix it before connecting.`);
}
function isOurCommand(hook2) {
  return typeof hook2?.command === "string" && hook2.command.includes(HOOK_MARKER);
}
function isOurs(entry) {
  return Array.isArray(entry?.hooks) && entry.hooks.some(isOurCommand);
}
function withoutOurHooks(file) {
  const hooks = {};
  for (const [event2, entries] of Object.entries(file.hooks ?? {})) {
    const kept = (Array.isArray(entries) ? entries : []).flatMap((entry) => {
      if (!isOurs(entry)) return [entry];
      const remaining = entry.hooks.filter((hook2) => !isOurCommand(hook2));
      return remaining.length ? [{ ...entry, hooks: remaining }] : [];
    });
    if (kept.length) hooks[event2] = kept;
  }
  const next = { ...file };
  if (Object.keys(hooks).length) next.hooks = hooks;
  else delete next.hooks;
  return next;
}
function withOurHooks(file, ours) {
  const base = withoutOurHooks(file);
  const hooks = { ...base.hooks ?? {} };
  for (const [event2, entry] of Object.entries(ours)) hooks[event2] = [...hooks[event2] ?? [], entry];
  return { ...base, hooks };
}
function hasOurHooks(file, events) {
  if (events) return events.every((event2) => Array.isArray(file.hooks?.[event2]) && file.hooks[event2].some(isOurs));
  return Object.values(file.hooks ?? {}).some((entries) => Array.isArray(entries) && entries.some(isOurs));
}
function stringify(file) {
  return JSON.stringify(file, null, 2) + "\n";
}

// src/core/adapters/claude.ts
var CLAUDE_APP_BUNDLE = CLAUDE_BUNDLE;
var CLAUDE_APP_PATHS = ["/Applications/Claude.app"];
var CLAUDE_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Notification",
  "Stop",
  "StopFailure",
  "SessionEnd"
];
function read(path) {
  try {
    return readFileSync3(path, "utf8");
  } catch {
    return "";
  }
}
function hookEntries(ctx) {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook claude`;
  const out = {};
  for (const ev of CLAUDE_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}
var s = (v) => typeof v === "string" ? v : "";
function hostFromEnv(env, transcriptPath) {
  const entry = env.CLAUDE_CODE_ENTRYPOINT ?? "";
  if (entry) return { host: /desktop/i.test(entry) ? "app" : "cli", entrypoint: entry };
  if (transcriptPath) {
    try {
      const { head, tail } = readHeadTail(transcriptPath);
      const info = parseClaude(parseLines(head), parseLines(tail));
      if (info.entrypoint)
        return { host: /desktop/i.test(info.entrypoint) ? "app" : "cli", entrypoint: info.entrypoint };
    } catch {
    }
  }
  if (env.__CFBundleIdentifier === CLAUDE_APP_BUNDLE) return { host: "app" };
  return {};
}
function attentionFor(type, message) {
  if (type === "idle_prompt" || type === "auth_success") return null;
  if (type === "permission_prompt" || /permission/i.test(message)) return "permission";
  if (type === "elicitation_dialog") return "question";
  if (/usage limit|rate limit|quota/i.test(message)) return "quota";
  if (!type && /waiting for your input/i.test(message)) return null;
  return "input";
}
function parseClaudeHook(payload, env, now = Date.now()) {
  const sessionId = s(payload.session_id);
  const name = s(payload.hook_event_name);
  if (!sessionId || !name) return null;
  const source2 = hostFromEnv(env, s(payload.transcript_path));
  const base = {
    agent: "claude",
    sessionId,
    host: source2.host,
    locator: source2.entrypoint ? { claudeEntrypoint: source2.entrypoint } : void 0,
    cwd: s(payload.cwd),
    transcriptPath: s(payload.transcript_path),
    at: now,
    ...hookIdentity(payload, now)
  };
  switch (name) {
    case "SessionStart":
      return { ...base, type: "started" };
    case "UserPromptSubmit":
      return { ...base, type: "progress", title: s(payload.prompt) };
    case "PreToolUse":
      return questionTool(s(payload.tool_name)) ? {
        ...base,
        type: "needs_input",
        attention: "question",
        requestIds: questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input)
      } : { ...base, type: "tool" };
    case "PermissionRequest":
      return {
        ...base,
        type: "needs_input",
        attention: questionTool(s(payload.tool_name)) ? "question" : "permission",
        requestIds: questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input)
      };
    case "PostToolUse":
      return {
        ...base,
        type: "tool",
        requestIds: isAsyncAcknowledgement(payload.tool_response) ? [] : questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input)
      };
    case "PostToolUseFailure":
      return { ...base, type: "tool", requestIds: requestIds(payload), summary: s(payload.error) };
    case "Notification": {
      const message = s(payload.message);
      const attention = attentionFor(s(payload.notification_type), message);
      if (!attention) return null;
      return { ...base, type: attention === "quota" ? "quota" : "needs_input", attention, summary: message };
    }
    case "Stop":
    case "SubagentStop": {
      if (name === "SubagentStop") return null;
      const last = s(payload.last_assistant_message) || (base.transcriptPath ? lastClaudeAssistant(base.transcriptPath) : "");
      return { ...base, type: "stopped", attention: asksForInput(last) ? "question" : void 0, summary: last };
    }
    case "StopFailure":
      return { ...base, type: "failed", summary: s(payload.error) || s(payload.message) };
    case "SessionEnd":
      return { ...base, type: "ended" };
    default:
      return null;
  }
}
var claudeNavigation = { openUrl, activateBundle, copyToClipboard, jumpToCli, readClaudeDesktopSessions };
async function jumpClaude(session, config, navigation = claudeNavigation) {
  const records = navigation.readClaudeDesktopSessions();
  const resolved = enrichClaudeSessions([session], records)[0];
  if (resolved.host !== "app")
    return navigation.jumpToCli(resolved, `claude --resume ${shQuote(resolved.sessionId)}`, config);
  const record2 = findClaudeDesktopSession(resolved.sessionId, records);
  const desktopId = record2?.sessionId || resolved.locator.claudeDesktopId || resolved.sessionId;
  let url;
  if (CLAUDE_LOCAL_ID.test(desktopId) && !record2?.isArchived) {
    url = `claude://code/continue?session=${encodeURIComponent(desktopId)}`;
  } else if (/^(cse|session)_[A-Za-z0-9_-]+$/.test(resolved.sessionId)) {
    url = `claude://code/${encodeURIComponent(resolved.sessionId)}`;
  }
  if (url && await navigation.openUrl(url)) return { ok: true, method: "url" };
  const activated = await navigation.activateBundle(CLAUDE_APP_BUNDLE);
  const copied = await navigation.copyToClipboard(resolved.sessionId);
  return { ok: activated && copied, method: "copied" };
}
var claudeAdapter = {
  id: "claude",
  source: {
    titles: readClaudeTitles,
    transcript: claudeTranscript,
    locateTranscript: async (session) => {
      const local = findClaudeDesktopSession(session.sessionId, readClaudeDesktopSessions());
      if (!local && CLAUDE_BRIDGE_ID.test(session.sessionId)) return void 0;
      return findTranscript(CLAUDE_PROJECTS, local?.cliSessionId || session.sessionId);
    }
  },
  name: "Claude Code",
  icon: "claude.svg",
  detect() {
    const cli = existsSync3(CLAUDE_DIR);
    const app = CLAUDE_APP_PATHS.some(existsSync3);
    let hooked = false;
    try {
      hooked = hasOurHooks(parseJsonFile(read(CLAUDE_SETTINGS), CLAUDE_SETTINGS), CLAUDE_EVENTS);
    } catch {
      hooked = false;
    }
    const hosts = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },
  planInstall(ctx) {
    const before = read(CLAUDE_SETTINGS);
    const entries = hookEntries(ctx);
    const after = stringify(withOurHooks(parseJsonFile(before, CLAUDE_SETTINGS), entries));
    return {
      changes: [
        {
          path: CLAUDE_SETTINGS,
          before,
          after,
          summary: CLAUDE_EVENTS.join(" \xB7 "),
          preview: JSON.stringify(
            { hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) },
            null,
            2
          ),
          previewLang: "json"
        }
      ],
      notes: []
    };
  },
  planUninstall() {
    const before = read(CLAUDE_SETTINGS);
    if (!before) return { changes: [], notes: [] };
    const after = stringify(withoutOurHooks(parseJsonFile(before, CLAUDE_SETTINGS)));
    return {
      changes: [
        { path: CLAUDE_SETTINGS, before, after, summary: CLAUDE_EVENTS.join(" \xB7 "), preview: "", previewLang: "json" }
      ],
      notes: []
    };
  },
  parseHook(_kind, payload, env) {
    return parseClaudeHook(payload, env);
  },
  jump: jumpClaude
};

// src/core/codex-desktop.ts
import { existsSync as existsSync4, readdirSync as readdirSync3, readFileSync as readFileSync4 } from "node:fs";
import { join as join5 } from "node:path";
async function readCodexTitles(sessions, root = CODEX_DIR, now = Date.now) {
  const observedAt = now();
  const known = new Set(sessions.map((session) => session.sessionId));
  return (await readCodexDesktopSessions(root)).filter((entry) => known.has(entry.sessionId)).map((entry) => ({
    agent: "codex",
    sessionId: entry.sessionId,
    title: entry.title,
    observedAt,
    source: "codex-catalog"
  }));
}
async function readCodexDesktopSessions(root = CODEX_DIR) {
  let files;
  try {
    files = readdirSync3(root).filter((name) => /^state(?:_\d+)?\.sqlite$/.test(name)).sort((a, b) => b.localeCompare(a, void 0, { numeric: true }));
  } catch {
    return [];
  }
  for (const file of files) {
    const path2 = join5(root, file);
    const schema = await query(path2, "PRAGMA table_info(threads);");
    const columns = new Set(schema?.map((row) => row.name));
    if (!columns.has("id") || !columns.has("name") && !columns.has("title")) continue;
    const col = (name2, fallback) => columns.has(name2) ? `"${name2}"` : fallback;
    const name = `COALESCE(NULLIF(${col("name", "NULL")}, ''), ${col("title", "''")}, '')`;
    const rows = await query(
      path2,
      `SELECT id, ${name} AS name, ${col("cwd", "''")} AS cwd, ${col("rollout_path", "''")} AS path, ${col("created_at_ms", `${col("created_at", "0")} * 1000`)} AS started, ${col("updated_at_ms", `${col("updated_at", "0")} * 1000`)} AS updated FROM threads${columns.has("archived") ? " WHERE archived=0" : ""};`
    );
    if (!rows) continue;
    return rows.filter((row) => typeof row.id === "string" && typeof row.name === "string" && row.name.trim()).map((row) => ({
      agent: "codex",
      sessionId: String(row.id),
      host: "app",
      title: String(row.name),
      cwd: typeof row.cwd === "string" ? row.cwd : "",
      transcriptPath: typeof row.path === "string" ? row.path : "",
      summary: "",
      startedAt: Number(row.started) || 0,
      updatedAt: Number(row.updated) || 0
    }));
  }
  const path = join5(root, "session_index.jsonl");
  if (!existsSync4(path)) return [];
  const names = /* @__PURE__ */ new Map();
  try {
    for (const line of readFileSync4(path, "utf8").split("\n")) {
      try {
        const row = JSON.parse(line);
        if (typeof row.id !== "string" || typeof row.thread_name !== "string" || !row.thread_name.trim()) continue;
        names.set(row.id, {
          agent: "codex",
          sessionId: row.id,
          host: "app",
          title: row.thread_name,
          cwd: "",
          summary: "",
          transcriptPath: "",
          startedAt: 0,
          updatedAt: Date.parse(row.updated_at) || 0
        });
      } catch {
      }
    }
  } catch {
  }
  return [...names.values()];
}
async function query(path, sql) {
  const result = await run("/usr/bin/sqlite3", ["-readonly", "-json", "-cmd", ".timeout 1000", path, sql]);
  if (!result.ok) return void 0;
  try {
    const rows = JSON.parse(result.stdout || "[]");
    return Array.isArray(rows) ? rows : void 0;
  } catch {
    return void 0;
  }
}

// src/core/adapters/codex.ts
import { existsSync as existsSync5, readFileSync as readFileSync5 } from "node:fs";
var CODEX_APP_BUNDLE = "com.openai.codex";
var CODEX_APP_PATHS = ["/Applications/Codex.app", "/Applications/ChatGPT.app"];
var CODEX_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "Stop",
  "SessionEnd"
];
var THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function jumpCodex(session, config, navigation = { openUrl, copyToClipboard, jumpToCli }) {
  if (session.host !== "app")
    return navigation.jumpToCli(session, `codex resume ${shQuote(session.sessionId)}`, config);
  if (THREAD_ID.test(session.sessionId)) {
    const host = session.locator?.hostId ? `?hostId=${encodeURIComponent(session.locator.hostId)}` : "";
    if (await navigation.openUrl(`codex://threads/${session.sessionId}${host}`)) return { ok: true, method: "url" };
  }
  const launched = await navigation.openUrl("codex://launch");
  const copied = await navigation.copyToClipboard(session.sessionId);
  return { ok: launched && copied, method: "copied" };
}
function read2(path) {
  try {
    return readFileSync5(path, "utf8");
  } catch {
    return "";
  }
}
var s2 = (v) => typeof v === "string" ? v : "";
function findNotify(toml) {
  const firstTable = toml.search(/^\s*\[/m);
  const region = firstTable === -1 ? toml : toml.slice(0, firstTable);
  const m = /^[ \t]*notify[ \t]*=[ \t]*\[/m.exec(region);
  if (!m) return null;
  let i = m.index + m[0].length;
  let inStr = null;
  let stringStart = i;
  const items = [];
  for (; i < toml.length; i++) {
    const c = toml[i];
    if (inStr) {
      if (c === "\\" && inStr === '"') i++;
      else if (c === inStr) {
        const value = toml.slice(stringStart, i + 1);
        if (inStr === '"') {
          try {
            items.push(JSON.parse(value));
          } catch {
            items.push(value.slice(1, -1));
          }
        } else items.push(value.slice(1, -1));
        inStr = null;
      }
    } else if (c === '"' || c === "'") {
      inStr = c;
      stringStart = i;
    } else if (c === "#") {
      while (i < toml.length && toml[i] !== "\n") i++;
    } else if (c === "]") break;
  }
  let end = i + 1;
  while (end < toml.length && toml[end] !== "\n") end++;
  return { start: m.index, end, items };
}
function setNotify(toml, items) {
  const span = findNotify(toml);
  const line = items ? `notify = [${items.map((x) => JSON.stringify(x)).join(", ")}]` : "";
  if (span) {
    const rest = toml.slice(span.end);
    if (!items) return toml.slice(0, span.start) + rest.replace(/^\n/, "");
    return toml.slice(0, span.start) + line + rest;
  }
  if (!items) return toml;
  return line + "\n" + (toml.startsWith("\n") || !toml ? "" : "\n") + toml;
}
function originalNotify(items) {
  if (!items.some((x) => x.includes(HOOK_MARKER))) return items;
  const i = items.indexOf("--then");
  return i === -1 ? [] : items.slice(i + 1);
}
function ourNotify(ctx, existing) {
  const orig = originalNotify(existing);
  const ours = [ctx.node, ctx.cli, "hook", "codex-notify"];
  return orig.length ? [...ours, "--then", ...orig] : ours;
}
function hostFromEnv2(env) {
  if (env.__CFBundleIdentifier === CODEX_APP_BUNDLE || /codex_app|desktop/i.test(env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE ?? ""))
    return "app";
  if (env.TERM_PROGRAM || env.TMUX || env.TTY) return "cli";
  return void 0;
}
function parseCodexNotify(payload, env, now = Date.now()) {
  const type = s2(payload.type);
  const sessionId = s2(payload["thread-id"]) || s2(payload.thread_id) || s2(payload["session-id"]);
  if (!sessionId) return null;
  const inputs = Array.isArray(payload["input-messages"]) ? payload["input-messages"].map(s2) : [];
  const last = s2(payload["last-assistant-message"]);
  const base = {
    agent: "codex",
    sessionId,
    host: hostFromEnv2(env),
    cwd: s2(payload.cwd),
    title: inputs[0] ?? "",
    at: eventTime(payload.timestamp, now),
    source: "notify",
    turnId: s2(payload["turn-id"]) || s2(payload.turn_id) || void 0
  };
  if (type === "agent-turn-complete") {
    return { ...base, type: "stopped", attention: asksForInput(last) ? "question" : void 0, summary: last };
  }
  if (/approval|permission/i.test(type))
    return { ...base, type: "needs_input", attention: "permission", summary: last };
  return null;
}
function parseCodexHook(payload, env, now = Date.now()) {
  const sessionId = s2(payload.session_id) || s2(payload.thread_id) || s2(payload.conversation_id);
  const name = s2(payload.hook_event_name);
  if (!sessionId) return null;
  const base = {
    agent: "codex",
    sessionId,
    host: hostFromEnv2(env),
    cwd: s2(payload.cwd),
    transcriptPath: s2(payload.transcript_path),
    at: now,
    ...hookIdentity(payload, now)
  };
  if (name === "SessionStart") return { ...base, type: "started" };
  if (name === "UserPromptSubmit") return { ...base, type: "progress", title: s2(payload.prompt) };
  if (name === "PreToolUse")
    return questionTool(s2(payload.tool_name)) ? {
      ...base,
      type: "needs_input",
      attention: "question",
      requestIds: questionIds(requestIds(payload)[0] ?? "", s2(payload.tool_name), payload.tool_input)
    } : { ...base, type: "tool" };
  if (name === "PermissionRequest")
    return {
      ...base,
      type: "needs_input",
      attention: questionTool(s2(payload.tool_name)) ? "question" : "permission",
      requestIds: questionIds(requestIds(payload)[0] ?? "", s2(payload.tool_name), payload.tool_input)
    };
  if (name === "PostToolUse" || name === "PostToolUseFailure")
    return {
      ...base,
      type: "tool",
      requestIds: isAsyncAcknowledgement(payload.tool_response) ? [] : questionIds(requestIds(payload)[0] ?? "", s2(payload.tool_name), payload.tool_input)
    };
  if (name === "Stop")
    return {
      ...base,
      type: "stopped",
      summary: s2(payload.last_assistant_message),
      attention: asksForInput(s2(payload.last_assistant_message)) ? "question" : void 0
    };
  if (name === "SessionEnd") return { ...base, type: "ended" };
  return null;
}
function hookEntries2(ctx) {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook codex`;
  const out = {};
  for (const ev of CODEX_HOOK_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}
var codexAdapter = {
  id: "codex",
  source: {
    transcript: codexTranscript,
    locateTranscript: async (session) => findTranscript(CODEX_SESSIONS, session.sessionId, true),
    titles: readCodexTitles
  },
  name: "Codex",
  icon: "openai.svg",
  detect() {
    const cli = existsSync5(CODEX_DIR);
    const app = CODEX_APP_PATHS.some(existsSync5);
    const toml = read2(CODEX_CONFIG);
    let hooked = false;
    try {
      hooked = (findNotify(toml)?.items ?? []).some((x) => x.includes(HOOK_MARKER)) && hasOurHooks(parseJsonFile(read2(CODEX_HOOKS), CODEX_HOOKS), CODEX_HOOK_EVENTS);
    } catch {
    }
    const hosts = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },
  planInstall(ctx) {
    const changes = [];
    const toml = read2(CODEX_CONFIG);
    const existing = findNotify(toml)?.items ?? [];
    const notify = ourNotify(ctx, existing);
    changes.push({
      path: CODEX_CONFIG,
      before: toml,
      after: setNotify(toml, notify),
      summary: "notify",
      preview: `notify = [${notify.map((x) => JSON.stringify(x)).join(", ")}]`,
      previewLang: "toml"
    });
    const hooksText = read2(CODEX_HOOKS);
    const entries = hookEntries2(ctx);
    changes.push({
      path: CODEX_HOOKS,
      before: hooksText,
      after: stringify(withOurHooks(parseJsonFile(hooksText, CODEX_HOOKS), entries)),
      summary: CODEX_HOOK_EVENTS.join(" \xB7 "),
      preview: JSON.stringify(
        { hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) },
        null,
        2
      ),
      previewLang: "json"
    });
    return { changes, notes: ["setup.codexHooksNote"] };
  },
  planUninstall() {
    const changes = [];
    const toml = read2(CODEX_CONFIG);
    const span = findNotify(toml);
    if (span && span.items.some((x) => x.includes(HOOK_MARKER))) {
      const orig = originalNotify(span.items);
      changes.push({
        path: CODEX_CONFIG,
        before: toml,
        after: setNotify(toml, orig.length ? orig : null),
        summary: "notify",
        preview: "",
        previewLang: "toml"
      });
    }
    const hooksText = read2(CODEX_HOOKS);
    if (hooksText) {
      const file = parseJsonFile(hooksText, CODEX_HOOKS);
      if (hasOurHooks(file))
        changes.push({
          path: CODEX_HOOKS,
          before: hooksText,
          after: stringify(withoutOurHooks(file)),
          summary: "hooks",
          preview: "",
          previewLang: "json"
        });
    }
    return { changes, notes: [] };
  },
  parseHook(kind, payload, env) {
    return kind === "codex-notify" ? parseCodexNotify(payload, env) : parseCodexHook(payload, env);
  },
  jump: jumpCodex
};

// src/core/adapters/custom.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync2, readdirSync as readdirSync4, readFileSync as readFileSync6, writeFileSync } from "node:fs";
import { join as join6 } from "node:path";
var fill = (tpl, s3) => tpl.split("{sessionId}").join(s3.sessionId).split("{cwd}").join(s3.cwd);
function manifestAdapter(m) {
  return {
    id: m.id,
    name: m.name || m.id,
    detect: () => ({ present: true, hooked: true, hosts: [] }),
    planInstall: () => ({ changes: [], notes: [] }),
    planUninstall: () => ({ changes: [], notes: [] }),
    async jump(session, config) {
      if (m.jumpUrl && (session.host === "app" || !m.resumeCommand)) {
        if (await openUrl(fill(m.jumpUrl, session))) return { ok: true, method: "url" };
      }
      if (m.resumeCommand) return jumpToCli(session, fill(m.resumeCommand, session), config);
      if (m.bundleId) return { ok: await activateBundle(m.bundleId), method: "activate" };
      return { ok: false, method: "none" };
    }
  };
}
function loadManifests(dir = ADAPTERS_DIR) {
  const out = [];
  let files = [];
  try {
    files = readdirSync4(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return out;
  }
  for (const f of files) {
    try {
      const m = JSON.parse(readFileSync6(join6(dir, f), "utf8"));
      if (m && typeof m.id === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(m.id) && m.id !== "claude" && m.id !== "codex")
        out.push(m);
    } catch {
    }
  }
  return out;
}

// src/core/adapters/index.ts
var BUILTIN_ADAPTERS = [claudeAdapter, codexAdapter];
function allAdapters() {
  return [...BUILTIN_ADAPTERS, ...loadManifests().map(manifestAdapter)];
}
function getAdapter(id) {
  return allAdapters().find((a) => a.id === id);
}

// src/core/config.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync3, readFileSync as readFileSync7, writeFileSync as writeFileSync2 } from "node:fs";
var DEFAULT_DEEPLINK_BASE = "raycast://extensions/silencerichard/agent-inbox";
var DEFAULT_CONFIG = {
  notifications: true,
  contentSearchEnabled: false,
  deeplinkBase: DEFAULT_DEEPLINK_BASE,
  resumeTerminal: "terminal"
};
function readConfig(path = CONFIG_PATH) {
  try {
    const raw = JSON.parse(readFileSync7(path, "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// src/core/format.ts
function attentionLabel(attention) {
  switch (attention) {
    case "question":
      return "Asked you a question";
    case "permission":
      return "Needs permission";
    case "failed":
      return "Failed";
    case "quota":
      return "Out of quota";
    case "interrupted":
      return "Interrupted";
    default:
      return "Waiting for input";
  }
}

// src/core/install.ts
import {
  chmodSync,
  copyFileSync,
  existsSync as existsSync8,
  mkdirSync as mkdirSync4,
  readFileSync as readFileSync8,
  writeFileSync as writeFileSync3,
  renameSync,
  rmSync
} from "node:fs";
import { dirname as dirname3 } from "node:path";
async function resolveNode(fallback = process.execPath) {
  const shell = process.env.SHELL && existsSync8(process.env.SHELL) ? process.env.SHELL : "/bin/zsh";
  const r = await run(shell, ["-lc", "command -v node"], void 0, 4e3);
  const fromShell = r.stdout.trim().split("\n").pop();
  if (r.ok && fromShell && fromShell.startsWith("/") && existsSync8(fromShell)) return fromShell;
  for (const p of ["/opt/homebrew/bin/node", "/usr/local/bin/node"]) if (existsSync8(p)) return p;
  return fallback && existsSync8(fallback) ? fallback : void 0;
}
function applyPlan(plan) {
  const written = [];
  for (const c of plan.changes) {
    if (c.before === c.after) continue;
    mkdirSync4(dirname3(c.path), { recursive: true });
    if (c.before) writeFileSync3(c.path + ".agent-inbox.bak", c.before);
    writeFileSync3(c.path, c.after);
    written.push(c.path);
  }
  return written;
}
function terminalNotifierPath() {
  for (const p of ["/opt/homebrew/bin/terminal-notifier", "/usr/local/bin/terminal-notifier"])
    if (existsSync8(p)) return p;
  return void 0;
}

// src/core/notifications/macos.ts
function raycastNotificationLink(config, message) {
  const context = encodeURIComponent(JSON.stringify({ jump: { agent: message.agent, sessionId: message.sessionId } }));
  return `${config.deeplinkBase}/inbox?context=${context}`;
}
function macosChannel(link = raycastNotificationLink, actions = { run, terminalNotifierPath }) {
  return {
    id: "macos",
    async send(message, { config }) {
      const title = message.attention && message.attention !== "input" ? attentionLabel(message.attention) : "Waiting for you";
      const notifier = actions.terminalNotifierPath();
      const result = notifier ? await actions.run(
        notifier,
        [
          "-title",
          title,
          "-subtitle",
          message.title,
          "-message",
          message.summary || " ",
          "-sound",
          "default",
          "-group",
          `${message.agent}:${message.sessionId}`,
          "-open",
          link(config, message)
        ],
        void 0,
        8e3
      ) : await actions.run(
        "/usr/bin/osascript",
        [
          "-e",
          `on run argv
  display notification (item 1 of argv) with title (item 2 of argv) subtitle (item 3 of argv) sound name "Glass"
end run`,
          "--",
          message.summary || " ",
          title,
          message.title
        ],
        void 0,
        8e3
      );
      if (!result.ok) throw new Error(result.stderr || "macOS notification failed");
    }
  };
}

// src/core/notifications/types.ts
function notificationMessage(id, session) {
  return {
    id,
    agent: session.agent,
    sessionId: session.sessionId,
    title: session.title || session.sessionId,
    summary: session.summary,
    attention: session.attention,
    at: session.updatedAt
  };
}

// src/core/notifications/index.ts
function enabledChannels(config) {
  return config.notifications ? [...new Set(config.notificationChannels ?? ["macos"])] : [];
}
async function deliverNotifications(store, config, channels = [macosChannel()], now) {
  const registry = new Map(channels.map((channel) => [channel.id, channel]));
  const enabled = enabledChannels(config);
  for (let count = 0; count < 20; count++) {
    const [job] = await store.claimNotifications(now ?? Date.now());
    if (!job) break;
    const session = JSON.parse(job.payload);
    const current = await store.get(session.agent, session.sessionId);
    if (!enabled.includes(job.channel) || !current?.subscribed || current.handledAt !== null || current.status !== "needs_input" || !sameAttention(session, current)) {
      await store.finishNotification(job, true, now ?? Date.now());
      continue;
    }
    const channel = registry.get(job.channel);
    const controller = new AbortController();
    let timer;
    try {
      if (!channel) throw new Error(`Unknown notification channel: ${job.channel}`);
      await Promise.race([
        channel.send(notificationMessage(job.id, { ...session, title: current.title }), {
          config,
          signal: controller.signal
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Notification timed out"));
          }, 1e4);
        })
      ]);
      await store.finishNotification(job, true, now ?? Date.now());
    } catch {
      await store.finishNotification(job, false, now ?? Date.now());
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
function sameAttention(queued, current) {
  const requests = queued.state?.pending ?? [];
  return requests.length ? requests.some((request) => current.state?.pending.some((p) => p.id === request.id && p.at === request.at)) : queued.attention === current.attention;
}

// src/core/engine.ts
var EventEngine = class {
  constructor(store, config) {
    this.store = store;
    this.config = config;
  }
  store;
  config;
  ingest(event2, options = {}) {
    return this.store.record(event2, { channels: enabledChannels(this.config()), ...options });
  }
};

// src/core/titles.ts
var key = (s3) => `${s3.agent}:${s3.sessionId}`;
var TitleSynchronizer = class {
  constructor(store, adapters) {
    this.store = store;
    this.adapters = adapters;
  }
  store;
  adapters;
  async refresh(sessions) {
    if (!sessions.length) return sessions;
    const adapters = this.adapters();
    const results = await Promise.allSettled(
      adapters.map((adapter) => {
        const owned = sessions.filter((s3) => s3.agent === adapter.id);
        return owned.length && adapter.source?.titles ? adapter.source.titles(owned) : Promise.resolve([]);
      })
    );
    const known = new Set(sessions.map(key));
    const observations = /* @__PURE__ */ new Map();
    for (const [index, result] of results.entries()) {
      if (result.status !== "fulfilled") continue;
      for (const o of result.value) {
        const title = o.title.replace(new RegExp("\\p{Cc}", "gu"), " ").replace(/\s+/g, " ").trim();
        if (o.agent !== adapters[index].id || !known.has(key(o)) || !title || !Number.isFinite(o.observedAt) || o.observedAt < 0)
          continue;
        const existing = observations.get(key(o));
        if (!existing || o.observedAt > existing.observedAt) observations.set(key(o), { ...o, title });
      }
    }
    const persisted = await this.store.syncTitles([...observations.values()]);
    for (const title of persisted) observations.set(key(title), title);
    return sessions.map((session) => {
      const observation = observations.get(key(session));
      return observation && observation.observedAt >= (session.titleObservedAt ?? 0) ? {
        ...session,
        title: observation.title,
        titleObservedAt: observation.observedAt,
        titleSource: observation.source
      } : session;
    });
  }
};

// src/core/service.ts
import { join as join7 } from "node:path";
import { homedir as homedir2 } from "node:os";
import { mkdirSync as mkdirSync5, writeFileSync as writeFileSync4, readFileSync as readFileSync9, existsSync as existsSync9 } from "node:fs";
var LABEL = "com.fango.agent-inbox.collector";
var xml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function collectorPlist(node, cli, root, env = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${LABEL}</string>
<key>ProgramArguments</key><array>${[node, cli, "watch"].map((arg) => `<string>${xml(arg)}</string>`).join("")}</array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>EnvironmentVariables</key><dict>${Object.entries({ ...env, AGENT_INBOX_HOME: root }).map(([key2, value]) => `<key>${xml(key2)}</key><string>${xml(value)}</string>`).join("")}</dict>
<key>StandardErrorPath</key><string>${xml(join7(root, "collector.log"))}</string>
</dict></plist>
`;
}
async function installCollector(node, cli = CLI_PATH) {
  const directory = join7(homedir2(), "Library", "LaunchAgents");
  const path = join7(directory, `${LABEL}.plist`);
  mkdirSync5(directory, { recursive: true });
  mkdirSync5(ROOT, { recursive: true });
  const env = {};
  for (const key2 of ["CODEX_HOME", "CLAUDE_CONFIG_DIR", "AGENT_INBOX_CLAUDE_DESKTOP_ROOT"])
    if (process.env[key2]) env[key2] = process.env[key2];
  const contents = collectorPlist(node, cli, ROOT, env);
  if (existsSync9(path) && readFileSync9(path, "utf8") !== contents) {
    writeFileSync4(path + ".agent-inbox.bak", readFileSync9(path));
    await run("/bin/launchctl", ["bootout", `gui/${process.getuid()}/${LABEL}`]);
  }
  writeFileSync4(path, contents);
  const domain = `gui/${process.getuid()}`;
  const existing = await run("/bin/launchctl", ["print", `${domain}/${LABEL}`]);
  if (!existing.ok) {
    const started = await run("/bin/launchctl", ["bootstrap", domain, path]);
    if (!started.ok) throw new Error(started.stderr || "Could not start the Agent Inbox collector");
  } else {
    const restarted = await run("/bin/launchctl", ["kickstart", "-k", `${domain}/${LABEL}`]);
    if (!restarted.ok) throw new Error(restarted.stderr || "Could not restart the Agent Inbox collector");
  }
}

// cli/agent-inbox.ts
var EVENT_TYPES = [
  "started",
  "progress",
  "tool",
  "needs_input",
  "resolved",
  "stopped",
  "completed",
  "failed",
  "quota",
  "interrupted",
  "ended"
];
var HELP = `Agent Inbox \u2014 subscribe to agent sessions and return when they need you.

usage: agent-inbox <command> [options]

Commands:
  list [--json]                         Show up to 100 recorded sessions
  jump <agent> <session>                 Return to a recorded session
  event --agent <id> --session <id> --type <type> [options]
                                        Record an external event
  hook <claude|codex>                    Read a hook payload from stdin
  hook codex-notify [--then <cmd...>] <json>
                                        Record and forward Codex notify
  watch [--once]                        Collect subscribed sessions and deliver notifications
  deliver                               Deliver queued notifications
  install <agent...> [--collector]       Install hooks and optionally the macOS collector
  version                               Print the internal CLI protocol revision
  help, --help, -h                       Show this help without creating state

Event types: ${EVENT_TYPES.join(", ")}
Event options: --title, --summary, --cwd, --host cli|app, --attention,
               --event-id, --turn, --request <id[,id...]>, --at <epoch-ms>
Attention: input, question, permission, failed, quota, interrupted

Data directory: AGENT_INBOX_HOME (default: ~/.sessions)
Install modifies agent configuration; watch and deliver may send notifications.
Setup, isolated examples and option defaults: https://github.com/0xFANGO/agent-inbox/blob/main/docs/cli.md
`;
function log(msg) {
  try {
    mkdirSync6(ROOT, { recursive: true });
    appendFileSync(LOG_PATH, `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}
`);
  } catch {
  }
}
function readStdin() {
  try {
    return readFileSync10(0, "utf8");
  } catch {
    return "";
  }
}
function parseJson(text2) {
  try {
    const v = JSON.parse(text2);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
async function record(ev) {
  const store = new Store();
  const t = await new EventEngine(store, readConfig).ingest(ev);
  if (t?.notify) detach(process.execPath, [process.argv[1], "deliver"]);
  return t;
}
async function hook(kind, args) {
  const adapterId = kind === "codex-notify" ? "codex" : kind;
  let payload;
  if (kind === "codex-notify") {
    const json2 = args[args.length - 1] ?? "{}";
    payload = parseJson(json2);
    const then = args.indexOf("--then");
    if (then !== -1 && args.length - 1 > then + 1) {
      const cmd = args.slice(then + 1, -1);
      detach(cmd[0], [...cmd.slice(1), json2]);
    }
  } else {
    payload = parseJson(readStdin());
  }
  const adapter = getAdapter(adapterId);
  if (!adapter?.parseHook) return;
  const ev = adapter.parseHook(kind, payload, process.env);
  if (!ev) return;
  if (ev.type !== "tool") ev.locator = { ...await captureLocator(process.env), ...ev.locator };
  await record(ev);
}
function flag(args, name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : void 0;
}
async function event(args) {
  const agent = flag(args, "agent");
  const sessionId = flag(args, "session");
  const type = flag(args, "type");
  if (!agent || !sessionId || !type || !EVENT_TYPES.includes(type)) {
    process.stderr.write(
      `usage: agent-inbox event --agent <id> --session <id> --type <${EVENT_TYPES.join("|")}> [--summary s] [--title t] [--cwd dir] [--host cli|app]
`
    );
    process.exitCode = 2;
    return;
  }
  const host = flag(args, "host");
  const attention = flag(args, "attention");
  if (attention && !["input", "question", "permission", "failed", "quota", "interrupted"].includes(attention)) {
    process.stderr.write("usage: --attention <input|question|permission|failed|quota|interrupted>\n");
    process.exitCode = 2;
    return;
  }
  await record({
    agent,
    sessionId,
    type,
    host: host === "app" ? "app" : host === "cli" ? "cli" : void 0,
    attention,
    cwd: flag(args, "cwd") ?? process.cwd(),
    title: flag(args, "title"),
    summary: flag(args, "summary"),
    locator: await captureLocator(process.env),
    at: Number(flag(args, "at")) || Date.now(),
    source: "external",
    eventId: flag(args, "event-id"),
    turnId: flag(args, "turn"),
    requestIds: flag(args, "request")?.split(",")
  });
}
async function jump(args) {
  const [agent, sessionId] = args;
  const store = new Store();
  const s3 = agent && sessionId ? await store.get(agent, sessionId) : void 0;
  const adapter = agent ? getAdapter(agent) : void 0;
  if (!s3 || !adapter) {
    process.stderr.write("session not found\n");
    process.exitCode = 1;
    return;
  }
  const r = await adapter.jump(s3, readConfig());
  process.stdout.write(`${r.method}
`);
  if (!r.ok) process.exitCode = 1;
}
async function list(args) {
  const rows = await new Store().all(100);
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  for (const s3 of rows) {
    process.stdout.write(
      `${s3.status.padEnd(11)} ${s3.subscribed ? "\u25CF" : " "} ${s3.agent}/${s3.host} ${s3.sessionId}  ${s3.title}
`
    );
  }
}
async function watch(once = false) {
  const store = new Store();
  const collector = new TranscriptCollector(new EventEngine(store, readConfig), allAdapters, log);
  const titles = new TitleSynchronizer(store, allAdapters);
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    do {
      try {
        await collector.poll();
        await titles.refresh(await store.subscribed());
        await deliverNotifications(store, readConfig());
      } catch (error) {
        log(`collector: ${String(error)}`);
      }
      if (once || stopping) break;
      await new Promise((resolve) => setTimeout(resolve, 2e3));
    } while (!stopping);
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(HELP);
      return;
    case "watch":
      return watch(rest.includes("--once"));
    case "deliver":
      return deliverNotifications(new Store(), readConfig());
    case "install": {
      const node = await resolveNode();
      if (!node) throw new Error("No Node runtime available for hooks");
      for (const id of rest.filter((arg) => !arg.startsWith("--"))) {
        const adapter = getAdapter(id);
        if (!adapter) throw new Error(`Unknown agent: ${id}`);
        applyPlan(adapter.planInstall({ node, cli: process.argv[1] }));
      }
      if (rest.includes("--collector")) await installCollector(node, process.argv[1]);
      return;
    }
    case "hook":
      try {
        await hook(rest[0] ?? "", rest.slice(1));
      } catch (e) {
        log(`hook ${rest[0]}: ${e.stack ?? e}`);
      }
      return;
    case "event":
      return event(rest);
    case "jump":
      return jump(rest);
    case "list":
      return list(rest);
    case "engine-probe":
    case "version":
      process.stdout.write("agent-inbox 1\n");
      return;
    default:
      process.stderr.write(
        "usage: agent-inbox <command> [options]\nRun agent-inbox --help for commands and options.\n"
      );
      process.exitCode = 2;
  }
}
main().catch((e) => {
  log(`fatal: ${e.stack ?? e}`);
  process.stderr.write(`${e.message ?? e}
`);
  process.exitCode = 1;
});
