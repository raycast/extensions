export type UsageWindow = {
  utilization: number;
  resetsAt: string | null;
  lockedReason: string | null;
};

export type UsageOrigin = "api" | "claude-code";

export type Usage = {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  sevenDayOpus: UsageWindow | null;
  sevenDaySonnet: UsageWindow | null;
  fetchedAt: number;
  origin?: UsageOrigin;
};

export type PlanInfo = { subscriptionType?: string; rateLimitTier?: string };

export type ErrorKind =
  | "not_found"
  | "denied"
  | "malformed"
  | "expired"
  | "unauthorized"
  | "rate_limited"
  | "server"
  | "network"
  | "schema"
  | "not_connected";

export type Snapshot = {
  usage: Usage | null;
  lastError: { kind: ErrorKind; at: number } | null;
  backoffUntil: number | null;
  backoffKind: ErrorKind | null;
  failures: number;
  lastAttemptAt: number | null;
  plan?: PlanInfo;
};

export const EMPTY_SNAPSHOT: Snapshot = {
  usage: null,
  lastError: null,
  backoffUntil: null,
  backoffKind: null,
  failures: 0,
  lastAttemptAt: null,
};

export type RingMode = "session" | "weekly" | "dual";

export type DataSource = "auto" | "claude-code";

export type Prefs = {
  ringMode: RingMode;
  showPercentText: boolean;
  warnThreshold: string;
  critThreshold: string;
  dataSource: DataSource;
  credentialsSource: "keychain" | "file";
};
