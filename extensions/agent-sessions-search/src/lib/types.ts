export type AgentId = "claude" | "codex";

export const AGENT_LABELS: Record<AgentId, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

/** One transcript file discovered on disk. */
export interface DiscoveredFile {
  agent: AgentId;
  file: string;
  size: number;
  mtime: number;
}

export type MessageRole = "user" | "assistant" | "tool" | "meta";

export interface IndexedMessage {
  role: MessageRole;
  ts: number | null;
  text: string;
}

export type RefKind = "pr" | "pr_repo" | "linear";
export type RefSource = "link" | "branch" | "user" | "assistant";

export interface RefEntry {
  kind: RefKind;
  value: string;
  source: RefSource;
  weight: number;
}

/** Persistent per-session state that survives incremental (append) indexing. */
export interface SessionState {
  id: string; // `${agent}:${sessionId}`
  agent: AgentId;
  sessionId: string;
  file: string;
  fileSize: number;
  fileMtime: number;
  indexedBytes: number;
  title: string | null;
  titleSource: string | null;
  cwd: string | null;
  repo: string | null; // owner/name when known
  repoRoot: string | null;
  branch: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  messageCount: number;
  firstPrompt: string | null;
  lastPrompt: string | null;
  entrypoint: string | null; // "claude-desktop", "cli", "Codex Desktop", ...
  archived: boolean;
  hidden: boolean; // subagent / non-resumable threads: recorded as skipped, never shown
}

export interface ParseResult {
  state: SessionState;
  messages: IndexedMessage[];
  refs: RefEntry[];
}

export interface ProviderContext {
  /** Resolve git repo info for a cwd (cached). */
  resolveRepo(cwd: string | null): { repo: string | null; repoRoot: string | null };
  /** Refs already stored for this session (incremental runs). */
  existingRefs(sessionId: string): RefEntry[];
}

export interface SessionProvider {
  id: AgentId;
  /** Called once per index run; providers can preload side tables (titles, etc). */
  prepare(): Promise<void>;
  discover(): Promise<DiscoveredFile[]>;
  /**
   * Parse a transcript. `previous` is the stored state when the file was indexed before
   * and only grew (append-only), in which case parsing starts at `previous.indexedBytes`.
   */
  parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult>;
}

/** Row returned by search, ready for the UI. */
export interface SessionHit {
  id: string;
  agent: AgentId;
  sessionId: string;
  file: string;
  title: string;
  cwd: string | null;
  repo: string | null;
  repoRoot: string | null;
  branch: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  messageCount: number;
  firstPrompt: string | null;
  lastPrompt: string | null;
  entrypoint: string | null;
  archived: boolean;
  /** Pinned in the Claude Desktop sidebar (read live from the app's session metadata). */
  pinned: boolean;
  prNumbers: string[];
  linearKeys: string[];
  /** PR number -> owner/repo, when known from a URL or Claude pr-link */
  prRepos: Record<string, string>;
  score: number;
  snippet: string | null;
  why: string[];
}
