export type UsageWindow = {
  utilization: number;
  resetsAt: string | null;
  lockedReason: string | null;
};

export type Usage = {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  sevenDayOpus: UsageWindow | null;
  sevenDaySonnet: UsageWindow | null;
  fetchedAt: number;
};

export type PlanInfo = { subscriptionType?: string; rateLimitTier?: string };

export type ErrorKind =
  "not_found" | "denied" | "malformed" | "expired" | "unauthorized" | "rate_limited" | "server" | "network" | "schema";

export type Snapshot = {
  usage: Usage | null;
  lastError: { kind: ErrorKind; at: number } | null;
  backoffUntil: number | null;
  failures: number;
  lastAttemptAt: number | null;
  plan?: PlanInfo;
};

export const EMPTY_SNAPSHOT: Snapshot = {
  usage: null,
  lastError: null,
  backoffUntil: null,
  failures: 0,
  lastAttemptAt: null,
};

export type RingMode = "session" | "weekly" | "dual";

export type Prefs = {
  ringMode: RingMode;
  showPercentText: boolean;
  warnThreshold: string;
  critThreshold: string;
  credentialsSource: "keychain" | "file";
};
