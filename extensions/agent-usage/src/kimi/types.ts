export interface KimiUsage {
  /** Total monthly/weekly quota */
  limit: number;
  /** Requests consumed */
  used: number;
  /** Requests remaining */
  remaining: number;
  /** ISO timestamp or epoch — when quota resets */
  resetTime: string;
  /** Present only when the API returns a limits[] entry */
  rateLimit?: {
    /** Window size in minutes (derived from duration + timeUnit) */
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
