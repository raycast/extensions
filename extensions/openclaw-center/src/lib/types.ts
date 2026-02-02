// Gateway Protocol Types (based on ClawdBot gateway protocol)

export const PROTOCOL_VERSION = 3;

// Frame types
export interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: ErrorShape;
}

export interface EventFrame {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: StateVersion;
}

export type GatewayFrame =
  | RequestFrame
  | ResponseFrame
  | EventFrame
  | { type: string; [key: string]: unknown };

// Connect params (sent as first message)
export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    displayName?: string;
    version: string;
    platform: string;
    mode: string;
  };
  role?: string;
  scopes?: string[];
  caps?: string[];
  commands?: string[];
  permissions?: Record<string, boolean>;
  auth?: {
    password?: string;
    token?: string;
  };
  locale?: string;
  userAgent?: string;
  device?: {
    id: string;
    publicKey: string;
    signature: string;
    signedAt: number;
    nonce: string;
  };
}

// Hello response from server
export interface HelloOk {
  type: "hello";
  protocol: number;
  server: Record<string, unknown>;
  features: Record<string, unknown>;
  snapshot: Snapshot;
  canvasHostUrl?: string;
  auth?: Record<string, unknown>;
  policy: Record<string, unknown>;
}

export interface Snapshot {
  presence: PresenceEntry[];
  health: Record<string, unknown>;
  stateVersion: StateVersion;
  uptimeMs: number;
  configPath?: string;
  stateDir?: string;
  sessionDefaults?: Record<string, unknown>;
}

export interface PresenceEntry {
  host?: string;
  ip?: string;
  version?: string;
  platform?: string;
  deviceFamily?: string;
  modelIdentifier?: string;
  mode?: string;
  lastInputSeconds?: number;
  reason?: string;
  tags?: string[];
  text?: string;
  ts: number;
  deviceId?: string;
  roles?: string[];
  scopes?: string[];
  instanceId?: string;
}

export interface StateVersion {
  presence: number;
  health: number;
}

export interface ErrorShape {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

// Health result
export interface HealthResult {
  ok: boolean;
  ts: number;
  uptime?: number;
  version?: string;
  gateway?: {
    connected: boolean;
    lastHeartbeat?: number;
  };
  [key: string]: unknown;
}

// Channels status
export interface ChannelsStatusResult {
  ts: number;
  channelOrder: string[];
  channelLabels: Record<string, string>;
  channelDetailLabels?: Record<string, string>;
  channelSystemImages?: Record<string, string>;
  channelMeta?: Array<Record<string, unknown>>;
  channels: Record<string, ChannelSummary>;
  channelAccounts: Record<string, ChannelAccountSnapshot[]>;
  channelDefaultAccountId: Record<string, string>;
}

export interface ChannelSummary {
  configured: boolean;
  connected?: boolean;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ChannelAccountSnapshot {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  connected?: boolean;
  status?: string;
  error?: string;
  label?: string;
  lastInboundAt?: number;
  lastOutboundAt?: number;
  lastProbeAt?: number;
  [key: string]: unknown;
}

// Skills
export interface SkillsStatusResult {
  skills: SkillEntry[];
  workspaceDir?: string;
  managedSkillsDir?: string;
  [key: string]: unknown;
}

export interface SkillEntry {
  // Gateway returns these fields
  skillKey: string;
  name: string;
  emoji?: string;
  description?: string;
  source?: string;
  filePath?: string;
  baseDir?: string;
  primaryEnv?: string;
  homepage?: string;
  always?: boolean;
  disabled: boolean;
  blockedByAllowlist?: boolean;
  eligible: boolean;
  missing?: {
    bins?: string[];
    anyBins?: string[];
    env?: string[];
    config?: string[];
    os?: string[];
  };
  requirements?: {
    bins?: string[];
    anyBins?: string[];
    env?: string[];
    config?: string[];
    os?: string[];
  };
  [key: string]: unknown;
}

// Cron jobs
export interface CronJob {
  id: string;
  agentId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: CronSchedule;
  sessionTarget: unknown;
  wakeMode: unknown;
  payload: unknown;
  isolation?: Record<string, unknown>;
  state: CronJobState;
}

export interface CronSchedule {
  type: "cron" | "interval" | "once";
  cron?: string;
  intervalMs?: number;
  runAtMs?: number;
  timezone?: string;
  [key: string]: unknown;
}

export interface CronJobState {
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: string;
  lastError?: string;
  runCount?: number;
  [key: string]: unknown;
}

export interface CronListResult {
  jobs: CronJob[];
}

export interface CronStatusResult {
  running: boolean;
  nextTickMs?: number;
  jobCount: number;
  enabledCount: number;
  [key: string]: unknown;
}

export interface CronRunLogEntry {
  ts: number;
  jobId: string;
  action: string;
  status?: string;
  error?: string;
  summary?: string;
  runAtMs?: number;
  durationMs?: number;
  nextRunAtMs?: number;
}

export interface CronRunsResult {
  entries: CronRunLogEntry[];
}

// Chat
export interface ChatHistoryResult {
  sessionKey: string;
  sessionId?: string;
  messages: ChatMessage[];
  thinkingLevel?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: ChatContent[];
  timestamp?: number;
  stopReason?: string;
  usage?: {
    input: number;
    output: number;
    totalTokens: number;
  };
  [key: string]: unknown;
}

export type ChatContent =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: string; media_type: string; data: string };
    }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown };

export interface ChatSendParams {
  sessionKey: string;
  message: string;
  thinking?: string;
  deliver?: boolean;
  attachments?: ChatAttachment[];
  timeoutMs?: number;
  idempotencyKey: string;
}

export interface ChatAttachment {
  type?: string;
  mimeType?: string;
  fileName?: string;
  content?: string;
}

export interface ChatSendResult {
  runId: string;
  status: "started" | "ok" | "error" | "in_flight";
  summary?: string;
}

export interface ChatEvent {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "streaming" | "delta" | "final" | "error";
  message?: ChatMessage;
  errorMessage?: string;
  usage?: {
    input: number;
    output: number;
    totalTokens: number;
  };
  stopReason?: string;
}

export interface ChatAbortParams {
  sessionKey: string;
  runId?: string;
}

export interface ChatAbortResult {
  ok: boolean;
  aborted: boolean;
  runIds: string[];
}
