/**
 * Preferences type definitions for Harmony Hub integration
 * @module
 */

/**
 * User preferences for the Harmony extension
 * @interface Preferences
 */
export interface Preferences {
  /** Default view to show after connecting */
  defaultView: "devices" | "activities";
  /** Whether to auto-connect to a single hub */
  autoConnect: boolean;
  /** Command hold time in milliseconds */
  commandHoldTime: string;
  /** Discovery timeout in milliseconds */
  discoveryTimeout: string;
  /** Discovery complete delay in milliseconds */
  discoveryCompleteDelay: string;
  /** Cache TTL in milliseconds */
  cacheTTL: string;
  /** Maximum cache entries */
  maxCacheEntries: string;
  /** Minimum log level */
  minLogLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
  /** Whether to include timestamps in logs */
  includeTimestamp: boolean;
  /** Whether to include log level in messages */
  includeLogLevel: boolean;
  /** Whether to log toast notifications */
  logToasts: boolean;
}
