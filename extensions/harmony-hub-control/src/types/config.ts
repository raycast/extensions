/**
 * Configuration types
 * @module
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  /** Maximum total retry duration in milliseconds */
  maxRetryDuration?: number;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Connection timeout in milliseconds */
  connection: number;
  /** Message timeout in milliseconds */
  message: number;
  /** Activity timeout in milliseconds */
  activity: number;
  /** Command timeout in milliseconds */
  command: number;
  /** Discovery timeout in milliseconds */
  discovery: number;
  /** Cache timeout in milliseconds */
  cache: number;
}
