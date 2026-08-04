export interface CursorRateWindow {
  usedPercent: number;
  percentageRemaining: number;
  resetsAt: string | null;
}

export interface CursorCostUsage {
  usedUsd: number;
  limitUsd: number | null;
  personalUsedUsd: number | null;
  resetsAt: string | null;
}

export interface CursorRequestUsage {
  used: number;
  limit: number;
  usedPercent: number;
}

export interface CursorUsage {
  account: string;
  source: string;
  total: CursorRateWindow;
  auto: CursorRateWindow | null;
  api: CursorRateWindow | null;
  onDemand: CursorCostUsage | null;
  legacyRequests: CursorRequestUsage | null;
  planUsedUsd: number;
  planLimitUsd: number;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  membershipType: string | null;
  accountEmail: string | null;
  accountName: string | null;
}

export interface CursorError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
