export interface AntigravityModelQuota {
  label: string;
  modelId: string;
  percentLeft: number;
  resetsIn: string;
  resetAt: string | null;
}

export interface AntigravityQuotaBucket {
  bucketId: string;
  displayName: string;
  description?: string;
  window: string;
  percentLeft: number;
  resetsIn: string;
  resetAt: string | null;
}

export interface AntigravityQuotaGroup {
  displayName: string;
  description?: string;
  buckets: AntigravityQuotaBucket[];
}

export interface AntigravityUsage {
  accountEmail: string | null;
  accountPlan: string | null;
  models: AntigravityModelQuota[];
  primaryModel: AntigravityModelQuota | null;
  secondaryModel: AntigravityModelQuota | null;
  tertiaryModel: AntigravityModelQuota | null;
  quotaGroups?: AntigravityQuotaGroup[];
}

export interface AntigravityError {
  type:
    | "not_running"
    | "missing_csrf"
    | "port_detection_failed"
    | "api_error"
    | "parse_error"
    | "network_error"
    | "unknown";
  message: string;
}
