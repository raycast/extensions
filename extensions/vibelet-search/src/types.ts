/**
 * Source-agnostic shapes used by the UI layer.
 */

/**
 * Source of a session.
 * - `claude-cli`  — Claude Code CLI (terminal)
 * - `claude-app`  — Claude Desktop app (`~/Library/Application Support/Claude/claude-code-sessions/`)
 * - `codex-cli`   — Codex CLI / codex_exec / @vibelet/cli / etc. (terminal originators)
 * - `codex-app`   — Codex Desktop app (originator = "Codex Desktop")
 *
 * Conversation files for both Claude variants live in `~/.claude/projects/`,
 * and both Codex variants live in `~/.codex/sessions/`. The split happens at meta load time.
 */
export type SessionSource = "claude-cli" | "claude-app" | "codex-cli" | "codex-app";

/** Underlying conversation file format — used to pick a JSONL adapter. */
export type SessionFormat = "claude" | "codex";

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  source: SessionSource;
  projectPath: string;
  timestamp: number; // epoch ms
  filePath: string; // path to the JSONL file for lazy loading
  /** Claude app extras: PR link surfaced in detail view if present. */
  prUrl?: string;
  prNumber?: number;
}

/**
 * Source-specific raw line shapes (only the fields we read).
 * Each adapter in `parsers.ts` consumes one of these.
 */

// Claude Code session index file: ~/.claude/sessions/<pid>.json
export interface ClaudeSessionIndexFile {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  kind?: string;
  entrypoint?: string;
}

// Claude Desktop app session metadata file:
// ~/Library/Application Support/Claude/claude-code-sessions/<user>/<workspace>/local_<sessionId>.json
export interface ClaudeAppSessionFile {
  sessionId: string;
  cliSessionId?: string;
  cwd?: string;
  originCwd?: string;
  createdAt?: number;
  lastActivityAt?: number;
  title?: string;
  titleSource?: string;
  isArchived?: boolean;
  prNumber?: number;
  prUrl?: string;
  prRepository?: string;
  prState?: string;
  model?: string;
}

// Claude Code conversation JSONL line
export interface ClaudeConversationLine {
  type: "user" | "assistant" | string;
  timestamp?: string;
  message?: {
    role: "user" | "assistant";
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

// Codex session index line: ~/.codex/session_index.jsonl
export interface CodexIndexLine {
  id: string;
  thread_name: string;
  updated_at: string;
}

// Codex conversation JSONL — supports two historical formats:
//   New: { type: "session_meta" | "response_item", payload: {...} }
//   Old: { type: "message", role, content } | { id, timestamp, instructions }
export interface CodexConversationLine {
  type?: string;
  // new format
  payload?: {
    type?: string;
    role?: "user" | "assistant";
    content?: Array<{ type?: string; text?: string }>;
    id?: string;
    cwd?: string;
    originator?: string;
    source?: string;
  };
  timestamp?: string;
  // old format (session-meta line)
  id?: string;
  instructions?: string | null;
  git?: { cwd?: string; branch?: string };
  // old format (message line)
  role?: "user" | "assistant";
  content?: Array<{ type?: string; text?: string }>;
}
