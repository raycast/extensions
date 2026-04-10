// src/api/types.ts
//
// Types copied from the niteshift CLI. Source of truth:
//   - niteshift-cli/src/types/api.ts
//   - niteshift-cli/src/types/agent.ts
//
// Drift policy: copy on demand. If the CLI changes a type, update here
// manually. Considered: a shared `@niteshift/api-client` npm package; deferred
// to v2 (see design doc §3 and §13).

export interface Repository {
  id: string;
  repoId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export type TaskStatus =
  | "provisioning"
  | "running"
  | "suspending"
  | "suspended"
  | "resuming"
  | "error"
  | "deleted";

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  createdAt: string;
  lastActivity?: string;
  /**
   * Repository identifier on the task. Whether the API returns this on the
   * list endpoint is to be verified during implementation (see plan §"Open
   * questions"). The list-tasks command joins against useRepositories to get
   * the full repo info.
   */
  repositoryId?: string;
  model?: string;
  /**
   * True when the user has archived the task in the Niteshift web UI. The
   * extension passes `include_archived=false` to /api/task so the list view
   * already excludes them at the API level; useTasks also filters
   * defensively in case a future API change starts returning them.
   */
  archived?: boolean;
  /**
   * Session-sync data added by the niteshift sync daemon. Used by pickup-task
   * to determine which tasks are ready to be pulled into a local session.
   */
  sessionSync?: {
    sessionId: string;
    agentType: string;
    updatedAt?: string;
  } | null;
}

export interface CreateTaskRequest {
  repositoryId: string;
  prompt: string;
  name?: string;
  model: string;
  branch?: string;
  prBaseBranch?: "default-branch" | "starting-branch";
}

export interface CreateTaskResponse {
  task: Task;
  claude: {
    id: string;
    taskId: string;
    initialTask: string;
    model: string;
  };
}

export interface WorkflowStateResponse {
  taskId?: string;
  state?: TaskStatus;
  sandboxId?: string;
  imageId?: string;
  queuedCount?: number;
  processing?: boolean;
  processingContent?: string;
  lastActivityAt?: number;
  version?: number;
  idleTimeoutMinutes?: number;
  error?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Agent models — copied from niteshift-cli/src/types/agent.ts
// ────────────────────────────────────────────────────────────────────────────

export const AGENT_MODEL_CHOICES = [
  // Claude
  { label: "claude-opus-4-6", value: "claude-opus-4-6" },
  { label: "claude-opus-4-5", value: "claude-opus-4-5-20251101" },
  { label: "claude-sonnet-4-6", value: "claude-sonnet-4-6" },
  { label: "claude-sonnet-4-5", value: "claude-sonnet-4-5-20250929" },
  { label: "claude-haiku-4-5", value: "claude-haiku-4-5-20251001" },
  // GPT-5.4
  { label: "gpt-5.4-xhigh", value: "gpt-5.4:xhigh" },
  { label: "gpt-5.4-high", value: "gpt-5.4:high" },
  { label: "gpt-5.4-medium", value: "gpt-5.4:medium" },
  { label: "gpt-5.4-low", value: "gpt-5.4:low" },
  // Codex (GPT-5.3)
  { label: "gpt-5.3-codex-xhigh", value: "gpt-5.3-codex:xhigh" },
  { label: "gpt-5.3-codex-high", value: "gpt-5.3-codex:high" },
  { label: "gpt-5.3-codex-medium", value: "gpt-5.3-codex:medium" },
  { label: "gpt-5.3-codex-low", value: "gpt-5.3-codex:low" },
  // Codex (GPT-5.2)
  { label: "gpt-5.2-codex-xhigh", value: "gpt-5.2-codex:xhigh" },
  { label: "gpt-5.2-codex-high", value: "gpt-5.2-codex:high" },
  { label: "gpt-5.2-codex-medium", value: "gpt-5.2-codex:medium" },
  { label: "gpt-5.2-codex-low", value: "gpt-5.2-codex:low" },
  // GPT-5.2
  { label: "gpt-5.2-xhigh", value: "gpt-5.2:xhigh" },
  { label: "gpt-5.2-high", value: "gpt-5.2:high" },
  { label: "gpt-5.2-medium", value: "gpt-5.2:medium" },
  { label: "gpt-5.2-low", value: "gpt-5.2:low" },
] as const;

export type AgentModelLabel = (typeof AGENT_MODEL_CHOICES)[number]["label"];
export type AgentModelValue = (typeof AGENT_MODEL_CHOICES)[number]["value"];

export const DEFAULT_AGENT_MODEL_LABEL: AgentModelLabel = "claude-opus-4-6";
