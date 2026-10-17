// Shapes of `hub … --json` output (Swift Codable, dates as ISO 8601 strings).

export type AgentStatus = "working" | "needsInput" | "finished" | "idle" | "ended";

export interface ProjectInfo {
  name: string;
  rootPath: string;
  branch?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  costUSD?: number;
  model?: string;
}

export interface Agent {
  id: string;
  adapter: "claude-code" | "codex" | "custom" | string;
  sessionID: string;
  slug: string;
  name: string;
  workingDirectory: string;
  project?: ProjectInfo;
  pid?: number;
  status: AgentStatus;
  statusDetail?: string;
  currentTask?: string;
  reported?: string;
  lastActivity: string;
  startedAt: string;
  integration: "watched" | "hooks" | string;
  ports: number[];
  terminalID?: string;
  worktreePath?: string;
  command?: string;
  usage?: TokenUsage;
}

export interface TranscriptEntry {
  role: "user" | "assistant" | "tool";
  text: string;
  timestamp?: string;
}

export interface AgentDetail {
  agent: Agent;
  brief: string;
  notes: string;
  log: string[];
  transcript: TranscriptEntry[];
  folderPath: string;
  projectContextPath?: string;
}

export interface Framework {
  id: string;
  displayName: string;
}

export interface LocalServer {
  ports: number[];
  category: "dev" | "app" | "system" | string;
  framework?: Framework;
  project?: ProjectInfo;
  launchCommand?: string;
  launchDirectory?: string;
  pinnedID?: string;
  health?: { reachable: boolean; statusCode?: number; pageTitle?: string };
  process: { pid: number; name: string; residentBytes?: number; cpuPercent?: number; workingDirectory?: string };
}

export interface PinnedServer {
  id: string;
  name: string;
  command: string;
  workingDirectory: string;
  port?: number;
}

export type PinnedRunState =
  | { stopped: Record<string, never> }
  | { starting: Record<string, never> }
  | { running: { pid: number; managed: boolean } }
  | { exited: { code: number } };

export interface PinnedStatus {
  server: PinnedServer;
  state: PinnedRunState;
  live?: LocalServer;
}

export interface Recipe {
  slug: string;
  name: string;
  kind: "claude-code" | "codex" | "custom";
  command?: string;
  folder: string;
  worktree: boolean;
  branchPrefix: string;
  servers: string[];
  brief: string;
  prompt: string;
}

export type SkillTarget = "claude" | "codex" | "cursor";

export interface SkillPlacement {
  target: SkillTarget;
  project?: string;
  path: string;
  state: "synced" | "shared" | "conflict" | "modified" | "failed";
  detail?: string;
}

export interface SkillSummary {
  name: string;
  description: string;
  path: string;
  settings: { targets: SkillTarget[]; global: boolean; projects: string[] };
  issues: { severity: "error" | "warning"; message: string }[];
  placements: SkillPlacement[];
  updatedAt?: string;
}

export interface SkillLibraryReport {
  libraryPath: string;
  skills: SkillSummary[];
  foreign: { name: string; description: string; path: string; target: SkillTarget; inLibrary: boolean }[];
}

export interface CaptureResult {
  agentID: string;
  agentName: string;
  folder: string;
  delivery: "typed" | "nextPrompt" | "saved";
}

export interface Summary {
  line: string;
  needsYou: { id: string; name: string; status: AgentStatus; detail?: string }[];
  working: number;
  agents: number;
  servers: number;
}

export interface TailOutput {
  lines: string[];
  running: boolean;
  exitCode?: number;
}
