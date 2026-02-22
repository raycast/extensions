/**
 * Options for the network retry utility.
 * Configures exponential backoff parameters for failed requests.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts. */
  maxRetries?: number;
  /** Initial delay in milliseconds. */
  initialDelay?: number;
  /** Maximum delay in milliseconds. */
  maxDelay?: number;
  /** Multiplier for exponential backoff. */
  backoffMultiplier?: number;
  /** List of retryable HTTP status codes. */
  retryableStatuses?: number[];
}
