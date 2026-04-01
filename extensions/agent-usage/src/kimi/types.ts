export interface KimiUsage {
  weeklyUsage: {
    limit: number;
    used: number;
    remaining: number;
    resetTime: string;
  };
  rateLimit: {
    windowMinutes: number;
    limit: number;
    used: number;
    remaining: number;
    resetTime: string;
  };
}

export interface KimiError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
