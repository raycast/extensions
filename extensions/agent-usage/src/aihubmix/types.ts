export interface AihubmixUsage {
  remainingUsd: number;
  usedUsd: number;
  requestCount: number;
  username: string;
}

export interface AihubmixError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
