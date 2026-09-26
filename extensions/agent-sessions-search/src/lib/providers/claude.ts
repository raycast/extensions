import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homeOf } from "../config";
import { readJsonlLines, safeJson } from "../jsonl";
import { RefCollector } from "../refs";
import { cleanText, makeTitle, oneLine, truncate } from "../text";
import { DiscoveredFile, IndexedMessage, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";

/**
 * Claude Code transcripts: ~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl
 * Record types we care about (observed in Claude Code 2.1.x):
 *  - user / assistant: message.content is a string or content blocks (text, tool_use, tool_result, thinking)
 *  - custom-title / ai-title / summary / agent-name: session titles
 *  - pr-link: { prNumber, prUrl, prRepository }  <- first-class PR association
 *  - last-prompt, worktree-state, relocated, attachment, ... ignored
 * Subagent transcripts live in <sessionId>/subagents/*.jsonl and are skipped (not resumable).
 */

const MAX_MESSAGE_CHARS = 30000;
const MAX_TOOL_CHARS = 300;

interface ClaudeRecord {
  type?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  entrypoint?: string;
  message?: { role?: string; content?: unknown };
  customTitle?: string;
  aiTitle?: string;
  summary?: string;
  agentName?: string;
  prNumber?: number | string;
  prUrl?: string;
  prRepository?: string;
  relocatedCwd?: string;
}

/**
 * Cheap byte-level filter so tool outputs, attachments and file snapshots (the bulk of a
 * transcript) are never JSON-parsed. Keeps memory flat inside Raycast's heap limit.
 */
const SKIP_TYPES = [
  '"type":"attachment"',
  '"type":"file-history-snapshot"',
  '"type":"file-history-delta"',
  '"type":"progress"',
  '"type":"queue-operation"',
  '"type":"atis-latch"',
  '"type":"bridge-session"',
  '"type":"last-prompt"',
  '"type":"mode"',
  '"type":"system"',
];
function isSkippableClaudeLine(text: string): boolean {
  const head = text.length > 400 ? text.slice(0, 400) : text;
  for (const t of SKIP_TYPES) if (head.includes(t)) return true;
  // user records whose content starts with a tool_result carry no human text
  if (head.includes('"type":"user"')) {
    const idx = text.indexOf('"content":[{');
    if (idx !== -1) {
      const open = text.slice(idx + 11, idx + 40);
      if (open.startsWith('"tool_use_id"') || open.startsWith('"type":"tool_result"')) return true;
    }
  }
  return false;
}

const TITLE_RANK: Record<string, number> = { "custom-title": 4, "ai-title": 3, summary: 2, "agent-name": 1, prompt: 0 };

export function claudeProjectsDir(): string {
  return join(homeOf("claude"), "projects");
}

function toolLine(name: string, input: unknown): string | null {
  if (!input || typeof input !== "object") return name;
  const i = input as Record<string, unknown>;
  const val = i.file_path ?? i.path ?? i.notebook_path ?? i.pattern ?? i.command ?? i.url ?? i.query ?? i.description;
  if (typeof val !== "string") return name;
  return truncate(`${name} ${val}`.replace(/\s+/g, " "), MAX_TOOL_CHARS);
}

export const claudeProvider: SessionProvider = {
  id: "claude",

  async prepare() {},

  async discover(): Promise<DiscoveredFile[]> {
    const root = claudeProjectsDir();
    const out: DiscoveredFile[] = [];
    let projectDirs: string[] = [];
    try {
      projectDirs = readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => join(root, e.name));
    } catch {
      return out;
    }
    for (const dir of projectDirs) {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
        const file = join(dir, e.name);
        try {
          const st = statSync(file);
          if (st.size === 0) continue;
          out.push({ agent: "claude", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
        } catch {
          // race with deletion
        }
      }
    }
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const sessionId = basename(file.file, ".jsonl");
    const id = `claude:${sessionId}`;
    const state: SessionState = previous
      ? { ...previous, fileSize: file.size, fileMtime: file.mtime }
      : {
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
          hidden: false,
        };
    const start = previous ? previous.indexedBytes : 0;
    const refs = new RefCollector(previous ? ctx.existingRefs(id) : []);
    const messages: IndexedMessage[] = [];
    let titleRank = previous?.titleSource ? (TITLE_RANK[previous.titleSource] ?? 0) : -1;
    let consumed = start;
    let prRepo: string | null = null;

    const setTitle = (source: string, value: string | undefined) => {
      const v = value?.trim();
      if (!v) return;
      const rank = TITLE_RANK[source] ?? 0;
      if (rank > titleRank || (rank === titleRank && source !== "prompt")) {
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
      const rec = safeJson<ClaudeRecord>(line.text);
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
          if (rec.prNumber !== undefined) {
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
      const role = rec.type as "user" | "assistant";
      const texts: string[] = [];
      if (typeof content === "string") {
        texts.push(content);
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (!block || typeof block !== "object") continue;
          const b = block as { type?: string; text?: string; name?: string; input?: unknown };
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
    const git = ctx.resolveRepo(state.cwd);
    state.repo = git.repo ?? prRepo ?? state.repo;
    state.repoRoot = git.repoRoot ?? state.repoRoot;
    if (!state.title) state.title = state.firstPrompt ? makeTitle(state.firstPrompt) : null;
    // Sessions with no human prompt at all (aborted launches) are noise.
    state.hidden = !previous && state.messageCount === 0 && !state.title;
    return { state, messages, refs: refs.entries() };
  },
};
