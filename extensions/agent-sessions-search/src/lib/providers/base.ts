import { DatabaseSync } from "node:sqlite";
import { RefCollector } from "../refs";
import { parseRemoteUrl } from "../git";
import { cleanText, makeTitle, oneLine, truncate } from "../text";
import { AgentId, DiscoveredFile, IndexedMessage, ParseResult, ProviderContext, SessionState } from "../types";

export const MAX_MESSAGE_CHARS = 30000;
export const MAX_TOOL_CHARS = 300;

/**
 * Shared accumulation logic for providers. Claude and Codex predate it and keep their own
 * hand-rolled loops (their incremental byte-offset parsing is bespoke); every other agent
 * builds its `ParseResult` here so a new provider only has to answer "where are the files"
 * and "what does one message look like".
 */
export class SessionBuilder {
  readonly state: SessionState;
  readonly messages: IndexedMessage[] = [];
  private readonly refs: RefCollector;
  private titleRank = -1;

  constructor(agent: AgentId, sessionId: string, file: DiscoveredFile, previous: SessionState | null = null) {
    // Appending to an already-indexed session: keep the title it already has, but at the lowest
    // rank so a better source found further down the file can still replace it.
    if (previous?.title) this.titleRank = 0;
    this.state = previous
      ? { ...previous, fileSize: file.size, fileMtime: file.mtime }
      : {
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
          hidden: false,
        };
    this.refs = new RefCollector([]);
  }

  /** Widen the session's time span with a timestamp in epoch milliseconds. */
  touch(ts: number | null | undefined) {
    if (ts === null || ts === undefined || !Number.isFinite(ts) || ts <= 0) return;
    if (this.state.createdAt === null || ts < this.state.createdAt) this.state.createdAt = ts;
    if (this.state.updatedAt === null || ts > this.state.updatedAt) this.state.updatedAt = ts;
  }

  /**
   * Record a title candidate. Higher `rank` wins; equal ranks keep the first one unless
   * `lastWins` is set, which is what agents that re-append their current title need.
   */
  setTitle(source: string, value: string | null | undefined, rank: number, lastWins = false) {
    const v = value?.trim();
    if (!v) return;
    if (rank < this.titleRank || (rank === this.titleRank && !lastWins)) return;
    const title = makeTitle(v, 120);
    if (!title) return;
    this.state.title = title;
    this.state.titleSource = source;
    this.titleRank = rank;
  }

  addMessage(role: "user" | "assistant", raw: string, ts?: number | null) {
    const trimmed = raw?.trim();
    if (!trimmed) return;
    const text = role === "user" ? cleanText(trimmed) : trimmed;
    if (!text) return;
    const stored = truncate(text, MAX_MESSAGE_CHARS);
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
  addTool(name: string, detail?: unknown, ts?: number | null) {
    if (!name) return;
    const arg = toolDetail(detail);
    this.touch(ts);
    this.messages.push({
      role: "tool",
      ts: ts ?? null,
      text: truncate(`${name}${arg ? ` ${arg}` : ""}`.replace(/\s+/g, " "), MAX_TOOL_CHARS),
    });
  }

  addPrLink(prNumber: string | number, repo: string | null) {
    this.refs.addLink(prNumber, repo);
  }

  /** Fill in derived fields (repo, timestamps, fallback title) and produce the parse result. */
  finish(
    file: DiscoveredFile,
    ctx: ProviderContext,
    opts: { repoUrl?: string | null; indexedBytes?: number } = {},
  ): ParseResult {
    const state = this.state;
    if (opts.indexedBytes !== undefined) state.indexedBytes = opts.indexedBytes;
    if (state.updatedAt === null) state.updatedAt = file.mtime;
    if (state.createdAt === null) state.createdAt = state.updatedAt;
    this.refs.addBranch(state.branch);
    const git = ctx.resolveRepo(state.cwd);
    state.repo = git.repo ?? parseRemoteUrl(opts.repoUrl) ?? state.repo;
    state.repoRoot = git.repoRoot ?? state.repoRoot;
    if (!state.title && state.firstPrompt) {
      state.title = makeTitle(state.firstPrompt);
      state.titleSource = "prompt";
    }
    // A session with no human prompt and no title is an aborted launch: noise.
    if (state.messageCount === 0 && !state.title) state.hidden = true;
    return { state, messages: this.messages, refs: this.refs.entries() };
  }
}

/** Most identifying argument of a tool call, across the argument names agents use. */
export function toolDetail(input: unknown): string {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object") return "";
  const i = input as Record<string, unknown>;
  const val =
    i.file_path ??
    i.filePath ??
    i.absolute_path ??
    i.path ??
    i.notebook_path ??
    i.pattern ??
    i.command ??
    i.cmd ??
    i.url ??
    i.query ??
    i.description ??
    i.prompt;
  return typeof val === "string" ? val : "";
}

/**
 * Agents that keep every session in one SQLite database instead of one file per session are
 * discovered as `<database path>#<session id>`: the indexer keys sessions by this string, so each
 * row still behaves like its own file (skipped when unchanged, removed when it disappears).
 */
export function dbSessionFile(dbPath: string, sessionId: string): string {
  return `${dbPath}#${sessionId}`;
}

export function splitDbSessionFile(file: string): { dbPath: string; sessionId: string } {
  const at = file.lastIndexOf("#");
  return at === -1 ? { dbPath: file, sessionId: "" } : { dbPath: file.slice(0, at), sessionId: file.slice(at + 1) };
}

/** Open a database read-only, returning null when it is missing, locked or not a database. */
export function openReadOnly(path: string): DatabaseSync | null {
  try {
    return new DatabaseSync(path, { readOnly: true });
  } catch {
    return null;
  }
}

export function tablesOf(db: DatabaseSync): Set<string> {
  try {
    const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[];
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

/** Columns of a table, so schema drift degrades into missing fields rather than a failed query. */
export function columnsOf(db: DatabaseSync, table: string): Set<string> {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

/** `col` when the table has it, otherwise a NULL literal, both aliased to `col`. */
export function pick(cols: Set<string>, col: string): string {
  return cols.has(col) ? `${col} AS ${col}` : `NULL AS ${col}`;
}
