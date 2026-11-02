// Shapes of the InstaBox API (https://api.instabox.sh/v1/openapi.json).
// The API still calls a sandbox a "machine" and pausing "suspend"; the code keeps those names.

export type MachineState =
  | "creating"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "suspending"
  | "suspended"
  | "resuming"
  | "deleting"
  | "deleted"
  | "error";

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  retryable?: boolean;
  operationId?: string | null;
}

export interface MachineSpec {
  vcpus: number;
  memMiB: number;
  persistentDiskGiB: number;
  rootDiskGiB?: number;
}

export interface TemplateRef {
  id: string;
  version: string;
  digest: string;
}

export interface Machine {
  id: string;
  name: string;
  state: MachineState;
  desiredState: MachineState;
  revision: number;
  operationId: string | null;
  template: TemplateRef;
  snapshot?: { id: string };
  spec: MachineSpec;
  storage: {
    sizeGiB: number;
    mountPath: string;
    persistent: boolean;
    synced: boolean;
    snapshotSeq?: number;
  };
  runtime: { ready: boolean; processesPreserved?: boolean };
  autoSuspendAfterSeconds: number | null;
  autoSuspendedAt?: string;
  archiveAt?: string | null;
  metadata: Record<string, string>;
  vault: boolean;
  guestUser: string;
  lastError?: ApiErrorBody;
  createdAt: string;
  updatedAt: string;
}

export interface MachineList {
  machines: Machine[];
  nextCursor: string | null;
}

export type OperationType = "create" | "start" | "stop" | "suspend" | "resume" | "delete";
export type OperationState = "queued" | "running" | "succeeded" | "failed";

export interface Operation {
  id: string;
  machineId: string;
  type: OperationType;
  state: OperationState;
  phase?: string;
  trigger?: string;
  error: ApiErrorBody | null;
  machine?: Machine;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineRequest {
  name: string;
  templateId?: string;
  snapshotId?: string;
  desiredState?: "running" | "stopped";
  /** Stops a running machine this many seconds after creation (60-86400). Only settable at creation. */
  archiveSeconds?: number;
  autoSuspendAfterSeconds?: number;
  metadata?: Record<string, string>;
  vault?: boolean;
}

export interface UpdateMachineRequest {
  autoSuspendAfterSeconds?: number;
  metadata?: Record<string, string>;
}

export interface ExecRequest {
  cmd: string;
  cwd?: string;
  envs?: Record<string, string>;
  stdin?: string;
  timeoutSeconds?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  truncated: boolean;
  signal?: string;
}

export type SnapshotStatus = "pending" | "ready" | "failed";

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  status: SnapshotStatus;
  error?: string;
  sourceMachineId: string;
  sourceSnapshotSeq: number;
  template: TemplateRef;
  rootSizeBytes: number;
  dataSizeBytes?: number;
  exclusiveBytes?: number;
  guestUser?: string;
  createdAt: string;
}

export interface CreateSnapshotRequest {
  name: string;
  description?: string;
  rootOnly?: boolean;
}

export interface Template {
  id: string;
  version: string;
  digest: string;
  arch: string;
  description?: string;
  hidden?: boolean;
  capabilities?: string[];
  defaultSpec: MachineSpec;
  runtime?: Record<string, string>;
}

export interface UsageLimits {
  maxMachines: number;
  maxSnapshots: number;
  maxStoredGiB: number;
  liveSnapshots?: boolean;
  machineSpec?: MachineSpec;
}

export interface Usage {
  computedAt: string | null;
  logicalBytes: number;
  storedBytes: number;
  exclusiveBytes: number;
  machines: number;
  snapshots: number;
  limits: UsageLimits;
}

/** The signed-in account (`GET /v1/me`), reduced to what the extension uses. */
export interface Me {
  userId: number;
  login: string;
  /** Any `autoSuspendAfterSeconds` applies (0: never). */
  manualLifecycle?: boolean;
  /** Otherwise a requested idle time is snapped to one of these. */
  idleChoicesSeconds?: number[];
  /** Whether 0 (never) is a choice alongside `idleChoicesSeconds`. */
  alwaysOnAllowed?: boolean;
  /** Set when the account has no choice: every machine pauses after this long idle. */
  fixedAutoSuspendSeconds?: number;
}

export interface MachineMetric {
  timestamp: string;
  cpuUsedPct: number;
  cpuCount: number;
  memUsed: number;
  memTotal: number;
  diskTotal: number;
}

export interface SSHToken {
  id: string;
  name: string;
  machineId: string;
  host: string;
  port: number;
  token: string;
  command: string;
  moshCommand?: string;
  expiresAt: string;
  hostKeyFingerprint: string;
}

export interface DesktopStatus {
  installed: boolean;
  installing: boolean;
  running: boolean;
  failed: boolean;
  log?: string;
  controller?: "agent" | "human";
  agentPausable: boolean;
}

export interface DesktopStream {
  url: string;
  expiresAt: string;
}

export interface PublicPort {
  id: string;
  machineId: string;
  port: number;
  name: string;
  url: string;
  createdAt: string;
}

export interface PublicPortList {
  enabled: boolean;
  ports: PublicPort[];
}
