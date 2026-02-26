export type SiteStatus = "up" | "down" | "blocked" | "available" | "error";

export interface CheckResult {
  url: string;
  status: SiteStatus;
  statusCode?: number;
  statusText?: string;
  responseTimeMs: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface HistoryEntry extends CheckResult {
  id: string;
  domain: string;
}
