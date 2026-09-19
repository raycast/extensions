import type {
  GroundcrewCanonicalStatus,
  GroundcrewLifecycle,
  GroundcrewPullRequest,
  GroundcrewSessionState,
  GroundcrewStatusBlockedIssue,
  GroundcrewStatusBoardIssue,
  GroundcrewStatusInventory,
  GroundcrewStatusQueueIssue,
  GroundcrewStatusSourceIssue,
  GroundcrewStatusTask,
  GroundcrewStatusWorktree,
  GroundcrewWorkspaceProbe,
  GroundcrewWorktreeDirtiness,
} from "../types/groundcrew";
import { GroundcrewClientError } from "./errors";

export const LEGACY_STATUS_SCHEMA_VERSION = 1 as const;

const CANONICAL_STATUSES = new Set<GroundcrewCanonicalStatus>(["todo", "in-progress", "in-review", "done", "other"]);
const LIFECYCLES = new Set<GroundcrewLifecycle>([
  "provisioning",
  "running",
  "interrupted",
  "resumed",
  "failed-to-launch",
  "idle",
]);
const SESSION_STATES = new Set<GroundcrewSessionState>(["live", "exited", "not-live", "unknown"]);

type LocalWorktree = Omit<GroundcrewStatusWorktree, "pullRequests">;
type LocalTask = Omit<GroundcrewStatusTask, "source" | "worktrees"> & {
  worktrees: LocalWorktree[];
};

interface LegacyLocalStatus {
  schemaVersion: 1;
  capturedAt: string;
  logCursor?: { device: number; inode: number; offset: number };
  maximumInProgress: number;
  workspaceProbe: GroundcrewWorkspaceProbe;
  tasks: LocalTask[];
  orphanedSessions: string[];
}

interface LegacyRemotePayload {
  capturedAt: string;
  sourceByTask: Record<string, GroundcrewStatusSourceIssue>;
  inProgress: GroundcrewStatusBoardIssue[];
  queueReady: GroundcrewStatusQueueIssue[];
  queueBlocked: GroundcrewStatusBlockedIssue[];
}

interface LegacyRemoteStatus {
  schemaVersion: 1;
  lastAttemptAt: string;
  lastAttemptStatus: "ok" | "unavailable";
  lastAttemptError?: string;
  payload?: LegacyRemotePayload;
  pullRequestsByWorktree: Record<string, GroundcrewPullRequest[]>;
}

interface LegacyInventory {
  local: LegacyLocalStatus;
  remote: LegacyRemoteStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isCanonicalStatus(value: unknown): value is GroundcrewCanonicalStatus {
  return typeof value === "string" && CANONICAL_STATUSES.has(value as GroundcrewCanonicalStatus);
}

function isWorktreeDirtiness(value: unknown): value is GroundcrewWorktreeDirtiness {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "clean" || value.kind === "unknown") {
    return true;
  }
  return value.kind === "dirty" && isFiniteNumber(value.modified) && isFiniteNumber(value.untracked);
}

function isLocalWorktree(value: unknown): value is LocalWorktree {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.repository === "string" &&
    value.kind === "host" &&
    typeof value.dir === "string" &&
    typeof value.branch === "string" &&
    isWorktreeDirtiness(value.git)
  );
}

function isLocalTask(value: unknown): value is LocalTask {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.task === "string" &&
    isOptionalString(value.title) &&
    isOptionalString(value.url) &&
    isOptionalString(value.agent) &&
    typeof value.lifecycle === "string" &&
    LIFECYCLES.has(value.lifecycle as GroundcrewLifecycle) &&
    isStringArray(value.flags) &&
    isOptionalString(value.startedAt) &&
    isOptionalString(value.updatedAt) &&
    (value.resumeCount === undefined || isFiniteNumber(value.resumeCount)) &&
    isOptionalString(value.reason) &&
    isOptionalString(value.detail) &&
    typeof value.session === "string" &&
    SESSION_STATES.has(value.session as GroundcrewSessionState) &&
    isOptionalString(value.attachCommand) &&
    isOptionalString(value.hint) &&
    Array.isArray(value.worktrees) &&
    value.worktrees.every(isLocalWorktree) &&
    isStringArray(value.recentLogLines)
  );
}

function isWorkspaceProbe(value: unknown): value is GroundcrewWorkspaceProbe {
  if (!isRecord(value)) {
    return false;
  }
  return (value.status === "ok" || value.status === "unavailable") && isOptionalString(value.error);
}

function isLogCursor(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return isFiniteNumber(value.device) && isFiniteNumber(value.inode) && isFiniteNumber(value.offset);
}

function isLocalStatus(value: unknown): value is LegacyLocalStatus {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schemaVersion === LEGACY_STATUS_SCHEMA_VERSION &&
    typeof value.capturedAt === "string" &&
    (value.logCursor === undefined || isLogCursor(value.logCursor)) &&
    isFiniteNumber(value.maximumInProgress) &&
    isWorkspaceProbe(value.workspaceProbe) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isLocalTask) &&
    isStringArray(value.orphanedSessions)
  );
}

function isBoardIssue(value: unknown): value is GroundcrewStatusBoardIssue {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.naturalId === "string" &&
    typeof value.title === "string" &&
    isOptionalString(value.url) &&
    isOptionalString(value.repository) &&
    isOptionalString(value.agent)
  );
}

function isSourceIssue(value: unknown): value is GroundcrewStatusSourceIssue {
  return isRecord(value) && isBoardIssue(value) && isCanonicalStatus(value.status);
}

function isQueueIssue(value: unknown): value is GroundcrewStatusQueueIssue {
  return isBoardIssue(value) && typeof value.repository === "string" && typeof value.agent === "string";
}

function isStatusBlocker(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.naturalId === "string" &&
    isCanonicalStatus(value.status) &&
    isOptionalString(value.nativeStatus)
  );
}

function isBlockedIssue(value: unknown): value is GroundcrewStatusBlockedIssue {
  return (
    isRecord(value) && isQueueIssue(value) && Array.isArray(value.blockedBy) && value.blockedBy.every(isStatusBlocker)
  );
}

function isPullRequest(value: unknown): value is GroundcrewPullRequest {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.url === "string" &&
    isFiniteNumber(value.number) &&
    typeof value.state === "string" &&
    typeof value.title === "string"
  );
}

function isRecordOf<T>(value: unknown, entryPredicate: (entry: unknown) => entry is T): value is Record<string, T> {
  return isRecord(value) && Object.values(value).every(entryPredicate);
}

function isRemotePayload(value: unknown): value is LegacyRemotePayload {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.capturedAt === "string" &&
    isRecordOf(value.sourceByTask, isSourceIssue) &&
    Array.isArray(value.inProgress) &&
    value.inProgress.every(isBoardIssue) &&
    Array.isArray(value.queueReady) &&
    value.queueReady.every(isQueueIssue) &&
    Array.isArray(value.queueBlocked) &&
    value.queueBlocked.every(isBlockedIssue)
  );
}

function isPullRequestRecord(value: unknown): value is Record<string, GroundcrewPullRequest[]> {
  return (
    isRecord(value) &&
    Object.values(value).every((pullRequests) => Array.isArray(pullRequests) && pullRequests.every(isPullRequest))
  );
}

function isRemoteStatus(value: unknown): value is LegacyRemoteStatus {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schemaVersion === LEGACY_STATUS_SCHEMA_VERSION &&
    typeof value.lastAttemptAt === "string" &&
    (value.lastAttemptStatus === "ok" || value.lastAttemptStatus === "unavailable") &&
    isOptionalString(value.lastAttemptError) &&
    (value.payload === undefined || isRemotePayload(value.payload)) &&
    isPullRequestRecord(value.pullRequestsByWorktree)
  );
}

function parseLegacyInventory(output: string): LegacyInventory {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output) as unknown;
  } catch (error) {
    throw new GroundcrewClientError("MALFORMED_JSON", "Groundcrew returned malformed JSON for crew status --json.", {
      cause: error,
      diagnostics: { stdout: output },
    });
  }

  if (!isRecord(parsed) || !isRecord(parsed.local) || !isRecord(parsed.remote)) {
    throw new GroundcrewClientError(
      "INVALID_JSON_SHAPE",
      "Groundcrew status JSON is not the expected legacy { local, remote } inventory.",
      { diagnostics: { stdout: output } },
    );
  }
  if (
    parsed.local.schemaVersion !== LEGACY_STATUS_SCHEMA_VERSION ||
    parsed.remote.schemaVersion !== LEGACY_STATUS_SCHEMA_VERSION
  ) {
    throw new GroundcrewClientError(
      "STATUS_SCHEMA_MISMATCH",
      `Groundcrew status schema is incompatible. This extension supports only legacy schema ${LEGACY_STATUS_SCHEMA_VERSION}; received local=${String(parsed.local.schemaVersion)}, remote=${String(parsed.remote.schemaVersion)}.`,
      { diagnostics: { stdout: output } },
    );
  }
  if (!isLocalStatus(parsed.local) || !isRemoteStatus(parsed.remote)) {
    throw new GroundcrewClientError(
      "INVALID_JSON_SHAPE",
      "Groundcrew status JSON does not match the known legacy schema. Upgrade the extension or select a compatible Groundcrew executable.",
      { diagnostics: { stdout: output } },
    );
  }
  return { local: parsed.local, remote: parsed.remote };
}

function ownProperty<T>(record: Record<string, T> | undefined, key: string): T | undefined {
  if (record === undefined || !Object.hasOwn(record, key)) {
    return undefined;
  }
  return record[key];
}

function withoutLocalWorktree<T extends GroundcrewStatusBoardIssue>(
  issues: readonly T[],
  localTasks: ReadonlySet<string>,
): T[] {
  return issues.filter((issue) => !localTasks.has(issue.naturalId.toLowerCase()));
}

export function parseLegacyStatusJson(output: string): GroundcrewStatusInventory {
  const { local, remote } = parseLegacyInventory(output);
  const payload = remote.payload;
  const localTasks = new Set(local.tasks.map((task) => task.task.toLowerCase()));
  const tasks: GroundcrewStatusTask[] = local.tasks.map((task) => {
    const naturalTaskId = task.task.toLowerCase();
    const source = ownProperty(payload?.sourceByTask, naturalTaskId);
    return {
      ...task,
      ...(source === undefined ? {} : { source }),
      worktrees: task.worktrees.map((worktree) => ({
        ...worktree,
        pullRequests: ownProperty(remote.pullRequestsByWorktree, worktree.dir) ?? [],
      })),
    };
  });

  return {
    schemaVersion: LEGACY_STATUS_SCHEMA_VERSION,
    localCapturedAt: local.capturedAt,
    remote: {
      lastAttemptAt: remote.lastAttemptAt,
      lastAttemptStatus: remote.lastAttemptStatus,
      ...(remote.lastAttemptError === undefined ? {} : { lastAttemptError: remote.lastAttemptError }),
      ...(payload === undefined ? {} : { capturedAt: payload.capturedAt }),
    },
    maximumInProgress: local.maximumInProgress,
    workspaceProbe: local.workspaceProbe,
    orphanedSessions: local.orphanedSessions,
    tasks,
    inProgressWithoutWorktree: payload === undefined ? [] : withoutLocalWorktree(payload.inProgress, localTasks),
    queueReady: payload === undefined ? [] : withoutLocalWorktree(payload.queueReady, localTasks),
    queueBlocked: payload === undefined ? [] : withoutLocalWorktree(payload.queueBlocked, localTasks),
    slots: payload === undefined ? undefined : { used: payload.inProgress.length, maximum: local.maximumInProgress },
  };
}

export function filterStatusByNaturalTaskId(
  inventory: GroundcrewStatusInventory,
  naturalTaskId: string,
): GroundcrewStatusInventory {
  const target = naturalTaskId.toLowerCase();
  const matches = (issue: GroundcrewStatusBoardIssue) => issue.naturalId.toLowerCase() === target;
  return {
    ...inventory,
    tasks: inventory.tasks.filter((task) => task.task.toLowerCase() === target),
    inProgressWithoutWorktree: inventory.inProgressWithoutWorktree.filter(matches),
    queueReady: inventory.queueReady.filter(matches),
    queueBlocked: inventory.queueBlocked.filter(matches),
  };
}
