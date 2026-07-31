export type AgentStatus = "working" | "blocked" | "done" | "idle" | "unknown";

export interface AgentSession {
  agent: string;
  kind: string;
  source: string;
  value: string;
}

export interface WorkspaceInfo {
  workspace_id: string;
  label: string;
  number: number;
  focused: boolean;
  active_tab_id?: string;
  tab_count: number;
  pane_count: number;
  agent_status?: AgentStatus;
  worktree?: {
    repo_key: string;
    repo_name: string;
    repo_root: string;
    checkout_path: string;
    is_linked_worktree: boolean;
  };
}

export interface TabInfo {
  tab_id: string;
  workspace_id: string;
  label: string;
  number: number;
  focused: boolean;
  pane_count: number;
  agent_status?: AgentStatus;
}

export interface PaneInfo {
  pane_id: string;
  tab_id: string;
  workspace_id: string;
  terminal_id: string;
  cwd?: string;
  foreground_cwd?: string;
  focused: boolean;
  revision?: number;
  terminal_title?: string;
  terminal_title_stripped?: string;
  agent?: string;
  name?: string;
  display_agent?: string;
  title?: string;
  interactive_ready?: boolean;
  launch_pending?: boolean;
  agent_status?: AgentStatus;
  agent_session?: AgentSession;
  scroll?: {
    offset_from_bottom: number;
    max_offset_from_bottom: number;
    viewport_rows: number;
  };
}

export interface AgentInfo extends PaneInfo {
  agent?: string;
  agent_status: AgentStatus;
  state_change_seq?: number;
}

export interface LayoutInfo {
  workspace_id: string;
  tab_id: string;
  focused_pane_id?: string;
  zoomed: boolean;
}

export interface HerdrSnapshot {
  version: string;
  protocol: number;
  focused_workspace_id?: string;
  focused_tab_id?: string;
  focused_pane_id?: string;
  workspaces: WorkspaceInfo[];
  tabs: TabInfo[];
  panes: PaneInfo[];
  agents: AgentInfo[];
  layouts: LayoutInfo[];
}

export interface HerdrSession {
  name: string;
  default: boolean;
  running: boolean;
  session_dir: string;
  socket_path: string;
}

export interface PromptHistoryItem {
  id: string;
  text: string;
  target: string;
  agent: string;
  kind?: string;
  createdAt: string;
}

export const AGENT_KINDS = [
  "claude",
  "codex",
  "gemini",
  "cursor",
  "pi",
  "opencode",
  "copilot",
  "devin",
  "droid",
  "kimi",
  "amp",
  "grok",
  "hermes",
  "kilo",
  "kiro",
  "cline",
  "omp",
  "mastracode",
  "qodercli",
  "maki",
  "agy",
] as const;

export type AgentKind = (typeof AGENT_KINDS)[number];
