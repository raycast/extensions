/**
 * Configuration types for the Harmony extension
 * @module
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** Whether to use exponential backoff */
  useBackoff: boolean;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Network request timeout in milliseconds */
  networkTimeout: number;
  /** Command execution timeout in milliseconds */
  commandTimeout: number;
  /** Discovery timeout in milliseconds */
  discoveryTimeout: number;
}
