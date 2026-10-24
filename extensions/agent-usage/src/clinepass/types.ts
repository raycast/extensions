export type ClinePassCredentialSource = "providers" | "legacy" | "local" | "manual";

export interface ClinePassCredential {
  id: string;
  label: string;
  token: string;
  userId: string;
  refreshToken?: string;
  expiresAt?: number;
  source: ClinePassCredentialSource;
  sourcePath?: string;
  clineHome?: string;
  validationError?: string | null;
}

export interface ClinePassLimit {
  percentageRemaining: number;
  resetsAt?: string;
  maxResetSeconds: number;
}

export interface ClinePassUsage {
  account: string;
  userId: string;
  fiveHourLimit: ClinePassLimit;
  weeklyLimit: ClinePassLimit;
  monthlyLimit: ClinePassLimit;
  credits: {
    balance: number;
    balanceUsd: number;
  };
}

export interface ClinePassError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}

export interface ClineProfile {
  id: string;
  email?: string;
  displayName?: string;
}

export interface ClineBalance {
  userId: string;
  balance: number;
}

export interface ClineUsageLimits {
  limits: Array<{
    type: string;
    percentUsed: number;
    resetsAt?: string;
  }>;
}
