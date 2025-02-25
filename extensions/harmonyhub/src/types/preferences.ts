/**
 * Preferences for the Harmony extension.
 */
export interface Preferences {
  /** The default view to display */
  defaultView: "activities" | "devices";
  /** The duration to hold a command in milliseconds */
  commandHoldTime: string;
  /** Whether to enable debug mode */
  debugMode: boolean;
  /** Whether to auto-retry failed commands */
  autoRetry: boolean;
  /** The maximum number of retries */
  maxRetries: string;
  /** The cache duration in seconds */
  cacheDuration: string;
  /** The network timeout in milliseconds */
  networkTimeout: string;
}
