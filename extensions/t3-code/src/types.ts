export interface Device {
  id: string;
  name: string;
  baseUrl: string;
  environmentId?: string;
  accessToken: string;
  tokenExpiresAt: string;
  pairingUrl?: string;
  addedAt: string;
  lastSeenAt: string | null;
}

export interface ModelSelection {
  instanceId: string;
  model: string;
  options?: Array<{ id: string; value: string | boolean }>;
}

export interface ProjectScript {
  id: string;
  name: string;
  command: string;
}

export interface OrchestrationProject {
  id: string;
  title: string;
  workspaceRoot: string;
  defaultModelSelection: ModelSelection | null;
  scripts: ProjectScript[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrchestrationSession {
  threadId: string;
  status:
    | "idle"
    | "starting"
    | "running"
    | "ready"
    | "interrupted"
    | "stopped"
    | "error";
  providerName: string | null;
  runtimeMode: RuntimeMode;
  activeTurnId: string | null;
  lastError: string | null;
  updatedAt: string;
}

export type RuntimeMode =
  | "approval-required"
  | "auto-accept-edits"
  | "full-access";
export type InteractionMode = "default" | "plan";

export interface ChatAttachment {
  type: string;
  name?: string;
  url?: string;
}

export interface OrchestrationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  attachments?: ChatAttachment[];
  turnId: string | null;
  streaming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationThreadActivity {
  id: string;
  tone: "info" | "tool" | "approval" | "error";
  kind: string;
  summary: string;
  payload: unknown;
  turnId: string | null;
  sequence?: number;
  createdAt: string;
}

export interface OrchestrationCheckpointSummary {
  id: string;
  turnId: string;
  createdAt: string;
}

export interface OrchestrationLatestTurn {
  turnId: string;
  state: "running" | "interrupted" | "completed" | "error";
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  assistantMessageId: string | null;
}

export interface OrchestrationThread {
  id: string;
  projectId: string;
  title: string;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: InteractionMode;
  branch: string | null;
  worktreePath: string | null;
  latestTurn: OrchestrationLatestTurn | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  messages: OrchestrationMessage[];
  activities: OrchestrationThreadActivity[];
  checkpoints: OrchestrationCheckpointSummary[];
  session: OrchestrationSession | null;
  hasPendingApprovals: boolean;
  hasPendingUserInput: boolean;
  hasActionableProposedPlan: boolean;
}

export interface ThreadSummary {
  id: string;
  projectId: string;
  title: string;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: InteractionMode;
  branch: string | null;
  sessionStatus: string | null;
  sessionLastError: string | null;
  latestTurnState: OrchestrationLatestTurn["state"] | null;
  hasPendingApprovals: boolean;
  hasPendingUserInput: boolean;
  updatedAt: string;
}

export interface OrchestrationSnapshot {
  snapshotSequence: number;
  updatedAt: string;
  projects: OrchestrationProject[];
  threads: OrchestrationThread[];
}

export interface EnvironmentInfo {
  environmentId: string;
  label: string;
  platform: { os: string; arch: string };
  serverVersion: string;
  capabilities: { repositoryIdentity?: boolean };
}

export interface TokenExchangeResponse {
  access_token: string;
  issued_token_type: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export type ConnectionState =
  | { status: "loading" }
  | { status: "connected" }
  | { status: "error"; message: string; retryCount: number }
  | { status: "unauthorized" }
  | { status: "offline" };

export interface PendingApproval {
  requestId: string;
  requestKind: "command" | "file-read" | "file-change";
  detail?: string;
  createdAt: string;
}

export interface ModelOption {
  key: string;
  instanceId: string;
  model: string;
  label: string;
  providerLabel: string;
}

export interface ServerProviderModel {
  slug: string;
  name: string;
  shortName?: string;
  subProvider?: string;
  isCustom?: boolean;
}

export interface ServerProviderAuth {
  status: "authenticated" | "unauthenticated" | "unknown";
}

export interface ServerProvider {
  instanceId: string;
  driver: string;
  displayName?: string;
  enabled: boolean;
  installed: boolean;
  auth?: ServerProviderAuth;
  status?: string;
  models: ServerProviderModel[];
}

export interface ServerConfig {
  providers: ServerProvider[];
}

export interface FeedEntry {
  type: "message" | "activities";
  createdAt: string;
  message?: OrchestrationMessage;
  activities?: OrchestrationThreadActivity[];
}
