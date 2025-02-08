/**
 * Harmony Hub preferences
 */
export interface HarmonyPreferences {
  hubHost: string;
  hubPort: number;
  hubPath: string;
  hubSecure: boolean;
  defaultView: "activities" | "devices";
}

/**
 * Harmony Hub retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  useExponentialBackoff: boolean;
  maxRetryDuration?: number;
}

/**
 * Harmony Hub timeout configuration
 */
export interface TimeoutConfig {
  connection: number;
  message: number;
  activity: number;
  command: number;
  discovery: number;
  cache: number;
}
