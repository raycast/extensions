import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getConfig, homeOf } from "../config";
import { parseRemoteUrl } from "../git";
import { readJsonlLines, safeJson } from "../jsonl";
import { RefCollector } from "../refs";
import { cleanText, makeTitle, oneLine, truncate } from "../text";
import { DiscoveredFile, IndexedMessage, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";

/**
 * Codex rollouts: $CODEX_HOME/sessions/YYYY/MM/DD/rollout-<ts>-<id>.jsonl (+ archived_sessions/).
 * Each line is { timestamp, type, payload }:
 *  - session_meta: id, cwd, originator, source (string, or object => subagent), git { branch, repository_url }
 *  - response_item.message role user/assistant with content [{ type: input_text | output_text, text }]
 *  - response_item.function_call / custom_tool_call: tool invocations
 *  - event_msg.thread_name_updated: title changes
 * Titles / branch / archived flags are richer in state_<N>.sqlite (table `threads`), which the
 * Codex desktop app maintains; we read it read-only and fall back to session_index.jsonl.
 * (Ideas from: raycast codex-sessions extension, Agent Sessions, codex-trace.)
 */

const MAX_MESSAGE_CHARS = 30000;
const MAX_TOOL_CHARS = 300;

interface ThreadMeta {
  title?: string | null;
  branch?: string | null;
  cwd?: string | null;
  archived?: boolean;
  originUrl?: string | null;
  subagent?: boolean;
  firstUserMessage?: string | null;
  updatedAtMs?: number | null;
}

interface RolloutLine {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

export function codexHome(): string {
  return homeOf("codex");
}

function walkJsonl(dir: string, out: DiscoveredFile[]) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkJsonl(p, out);
    else if (e.isFile() && e.name.endsWith(".jsonl")) {
      try {
        const st = statSync(p);
        if (st.size > 0) out.push({ agent: "codex", file: p, size: st.size, mtime: Math.floor(st.mtimeMs) });
      } catch {
        // ignore
      }
    }
  }
}

function newestStateDb(home: string): string | null {
  let best: { path: string; n: number } | null = null;
  try {
    for (const name of readdirSync(home)) {
      const m = name.match(/^state_(\d+)\.sqlite$/);
      if (m && (!best || Number(m[1]) > best.n)) best = { path: join(home, name), n: Number(m[1]) };
    }
  } catch {
    return null;
  }
  return best?.path ?? null;
}

let threadMeta = new Map<string, ThreadMeta>();
/** Thread ids that Codex Desktop created by importing Claude Code transcripts (duplicates of Claude sessions). */
let importedThreadIds = new Set<string>();

const HIDDEN_THREAD_SOURCES = new Set(["subagent", "guardian_review", "onboarding_checklist"]);

function loadImportedThreads(home: string) {
  importedThreadIds = new Set();
  const file = join(home, "external_agent_session_imports.json");
  if (!existsSync(file)) return;
  try {
    const data = JSON.parse(readFileSync(file, "utf8")) as { records?: { imported_thread_id?: string }[] };
    for (const r of data.records ?? []) if (r.imported_thread_id) importedThreadIds.add(r.imported_thread_id);
  } catch {
    // ignore
  }
}

function loadThreadMeta(home: string) {
  threadMeta = new Map();
  const dbPath = newestStateDb(home);
  if (dbPath) {
    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      try {
        const cols = new Set((db.prepare(`PRAGMA table_info(threads)`).all() as { name: string }[]).map((c) => c.name));
        const pick = (c: string, alias = c) => (cols.has(c) ? `${c} AS ${alias}` : `NULL AS ${alias}`);
        const sql = `SELECT id, ${pick("title")}, ${pick("git_branch")}, ${pick("cwd")}, ${pick("archived")},
          ${pick("git_origin_url")}, ${pick("thread_source")}, ${pick("source")}, ${pick("first_user_message")},
          ${pick("updated_at_ms")}, ${pick("updated_at")} FROM threads`;
        for (const r of db.prepare(sql).all() as Record<string, unknown>[]) {
          const source = typeof r.source === "string" ? r.source : "";
          threadMeta.set(String(r.id), {
            title: (r.title as string | null) || null,
            branch: (r.git_branch as string | null) || null,
            cwd: (r.cwd as string | null) || null,
            archived: Number(r.archived ?? 0) === 1,
            originUrl: (r.git_origin_url as string | null) || null,
            subagent:
              HIDDEN_THREAD_SOURCES.has(String(r.thread_source ?? "")) || source.startsWith("{") || source === "exec",
            firstUserMessage: (r.first_user_message as string | null) || null,
            updatedAtMs: (r.updated_at_ms as number | null) ?? (r.updated_at ? Number(r.updated_at) * 1000 : null),
          });
        }
      } finally {
        db.close();
      }
    } catch {
      // DB locked or schema drift: fall through to session_index.jsonl
    }
  }
  const indexFile = join(home, "session_index.jsonl");
  if (existsSync(indexFile)) {
    try {
      for (const line of readFileSync(indexFile, "utf8").split("\n")) {
        const rec = safeJson<{ id?: string; thread_name?: string; title?: string }>(line);
        if (!rec?.id) continue;
        const name = (rec.thread_name ?? rec.title ?? "").trim();
        if (!name) continue;
        const cur = threadMeta.get(rec.id) ?? {};
        if (!cur.title) threadMeta.set(rec.id, { ...cur, title: name });
      }
    } catch {
      // ignore
    }
  }
}

/** Byte-level prefilter: only session_meta, turn_context, thread-name events and response_item messages/calls matter. */
function isSkippableCodexLine(text: string): boolean {
  const head = text.length > 160 ? text.slice(0, 160) : text;
  if (head.includes('"type":"response_item"')) {
    return (
      head.includes('"type":"function_call_output"') ||
      head.includes('"type":"custom_tool_call_output"') ||
      head.includes('"type":"reasoning"') ||
      head.includes('"type":"agent_message"') ||
      head.includes('"role":"developer"')
    );
  }
  if (head.includes('"type":"event_msg"')) return !head.includes("thread_name_updated");
  return !(head.includes('"type":"session_meta"') || head.includes('"type":"turn_context"'));
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const c of content) {
    if (c && typeof c === "object") {
      const b = c as { type?: string; text?: string };
      if ((b.type === "input_text" || b.type === "output_text" || b.type === "text") && typeof b.text === "string") {
        parts.push(b.text);
      }
    }
  }
  return parts.join("\n");
}

export const codexProvider: SessionProvider = {
  id: "codex",

  async prepare() {
    const home = codexHome();
    loadThreadMeta(home);
    loadImportedThreads(home);
  },

  async discover(): Promise<DiscoveredFile[]> {
    const home = codexHome();
    const out: DiscoveredFile[] = [];
    walkJsonl(join(home, "sessions"), out);
    if (getConfig().includeArchived) {
      walkJsonl(join(home, "archived_sessions"), out);
    }
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const fromName = file.file.match(
      /rollout-.*?-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i,
    )?.[1];
    let sessionId = previous?.sessionId ?? fromName ?? "";
    const isArchivedDir = file.file.includes("/archived_sessions/");
    const state: SessionState = previous
      ? { ...previous, fileSize: file.size, fileMtime: file.mtime }
      : {
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
          hidden: false,
        };
    const start = previous ? previous.indexedBytes : 0;
    const refs = new RefCollector(previous ? ctx.existingRefs(previous.id) : []);
    const messages: IndexedMessage[] = [];
    let consumed = start;
    let hidden = previous?.hidden ?? false;
    let threadName: string | null = null;
    let repoUrl: string | null = null;
    let seenMeta = !!previous;

    for await (const line of readJsonlLines(file.file, start)) {
      if (isSkippableCodexLine(line.text)) {
        if (!line.partial) consumed = line.end;
        continue;
      }
      const rec = safeJson<RolloutLine>(line.text);
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
        // Only the first session_meta identifies this file (forks embed the parent's).
        if (seenMeta) continue;
        seenMeta = true;
        const metaId = (p.id ?? p.session_id) as string | undefined;
        if (metaId) sessionId = metaId;
        if (typeof p.cwd === "string") state.cwd = p.cwd;
        if (typeof p.originator === "string") state.entrypoint = p.originator;
        const source = p.source;
        if (source && typeof source === "object") hidden = true; // subagent / spawned worker thread
        if (typeof p.thread_source === "string" && HIDDEN_THREAD_SOURCES.has(p.thread_source)) hidden = true;
        if (metaId && importedThreadIds.has(metaId)) hidden = true; // imported copy of a Claude session
        const git = p.git as { branch?: string; repository_url?: string } | undefined;
        if (git?.branch) state.branch = git.branch;
        if (git?.repository_url) repoUrl = git.repository_url;
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
        const stored = truncate(text, MAX_MESSAGE_CHARS);
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
          text: truncate(`${name} ${args}`.replace(/\s+/g, " "), MAX_TOOL_CHARS),
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
      state.titleSource = meta?.title ? "state-db" : threadName ? "thread-name" : (previous?.titleSource ?? null);
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
    const git = ctx.resolveRepo(state.cwd);
    state.repo = git.repo ?? parseRemoteUrl(repoUrl) ?? state.repo;
    state.repoRoot = git.repoRoot ?? state.repoRoot;
    if (!state.hidden && !previous && state.messageCount === 0 && !state.title) state.hidden = true;
    return { state, messages, refs: refs.entries() };
  },
};
