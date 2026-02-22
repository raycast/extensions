/**
 * Retry utility with exponential backoff
 * Handles rate limiting and transient errors
 */

import { RetryOptions } from "../types/network";

export type { RetryOptions };

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504], // Rate limit and server errors
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable based on status code
 */
function isRetryableError(
  error: unknown,
  retryableStatuses: number[],
): boolean {
  if (error instanceof Error && "status" in error) {
    const status = (error as { status?: number }).status;
    return status !== undefined && retryableStatuses.includes(status);
  }
  return false;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, config.retryableStatuses)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await sleep(Math.min(delay, config.maxDelay));
      delay *= config.backoffMultiplier;
    }
  }

  throw lastError;
}
