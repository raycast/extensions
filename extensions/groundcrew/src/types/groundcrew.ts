export type GroundcrewCanonicalStatus = "todo" | "in-progress" | "in-review" | "done" | "other";

export interface GroundcrewTaskBlocker {
  id: string;
  title: string;
  status: GroundcrewCanonicalStatus;
  statusReason?: "missing" | "unmapped";
  nativeStatus?: string;
}

export interface GroundcrewTask {
  id: string;
  source: string;
  title: string;
  description: string;
  status: GroundcrewCanonicalStatus;
  repository?: string;
  agent?: string;
  assignee: string;
  updatedAt: string;
  blockers: GroundcrewTaskBlocker[];
  hasMoreBlockers: boolean;
  url?: string;
  priority?: number;
}

export type GroundcrewLifecycle = "provisioning" | "running" | "interrupted" | "resumed" | "failed-to-launch" | "idle";

export type GroundcrewSessionState = "live" | "exited" | "not-live" | "unknown";

export type GroundcrewWorktreeDirtiness =
  { kind: "dirty"; modified: number; untracked: number } | { kind: "clean" } | { kind: "unknown" };

export interface GroundcrewPullRequest {
  url: string;
  number: number;
  state: string;
  title: string;
}

export interface GroundcrewStatusWorktree {
  repository: string;
  kind: "host";
  dir: string;
  branch: string;
  git: GroundcrewWorktreeDirtiness;
  pullRequests: GroundcrewPullRequest[];
}

export interface GroundcrewStatusSourceIssue {
  id: string;
  naturalId: string;
  title: string;
  url?: string;
  repository?: string;
  agent?: string;
  status: GroundcrewCanonicalStatus;
}

export interface GroundcrewStatusTask {
  task: string;
  title?: string;
  url?: string;
  agent?: string;
  lifecycle: GroundcrewLifecycle;
  flags: string[];
  startedAt?: string;
  updatedAt?: string;
  resumeCount?: number;
  reason?: string;
  detail?: string;
  session: GroundcrewSessionState;
  attachCommand?: string;
  hint?: string;
  worktrees: GroundcrewStatusWorktree[];
  recentLogLines: string[];
  source?: GroundcrewStatusSourceIssue;
}

export interface GroundcrewStatusBoardIssue {
  id: string;
  naturalId: string;
  title: string;
  url?: string;
  repository?: string;
  agent?: string;
}

export interface GroundcrewStatusQueueIssue extends GroundcrewStatusBoardIssue {
  repository: string;
  agent: string;
}

export interface GroundcrewStatusBlocker {
  id: string;
  naturalId: string;
  status: GroundcrewCanonicalStatus;
  nativeStatus?: string;
}

export interface GroundcrewStatusBlockedIssue extends GroundcrewStatusQueueIssue {
  blockedBy: GroundcrewStatusBlocker[];
}

export interface GroundcrewRemoteHealth {
  lastAttemptAt: string;
  lastAttemptStatus: "ok" | "unavailable";
  lastAttemptError?: string;
  capturedAt?: string;
}

export interface GroundcrewWorkspaceProbe {
  status: "ok" | "unavailable";
  error?: string;
}

export interface GroundcrewStatusInventory {
  schemaVersion: 1;
  localCapturedAt: string;
  remote: GroundcrewRemoteHealth;
  maximumInProgress: number;
  workspaceProbe: GroundcrewWorkspaceProbe;
  orphanedSessions: string[];
  tasks: GroundcrewStatusTask[];
  inProgressWithoutWorktree: GroundcrewStatusBoardIssue[];
  queueReady: GroundcrewStatusQueueIssue[];
  queueBlocked: GroundcrewStatusBlockedIssue[];
  slots: { used: number; maximum: number } | undefined;
}

export interface GroundcrewProcessDiagnostics {
  stdout: string;
  stderr: string;
}

export type GroundcrewLifecycleResult =
  | ({ kind: "success"; exitCode: 0 } & GroundcrewProcessDiagnostics)
  | ({
      kind: "failure";
      exitCode: number | null;
      signal: NodeJS.Signals | null;
    } & GroundcrewProcessDiagnostics)
  | ({ kind: "timeout" } & GroundcrewProcessDiagnostics)
  | ({ kind: "canceled" } & GroundcrewProcessDiagnostics)
  | ({ kind: "launch-failure"; error: Error } & GroundcrewProcessDiagnostics);
