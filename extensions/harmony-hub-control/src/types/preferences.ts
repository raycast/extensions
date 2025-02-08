/**
 * User preferences interface
 */
export interface Preferences {
  /** Enable debug logging */
  debugLogging: boolean;
  /** Automatically discover hubs */
  autoDiscover: boolean;
  /** Hub refresh interval in seconds */
  refreshInterval: number;
}
