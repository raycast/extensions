import { PrusaApiError } from "../api/errors";
import type { PrusaClientConfig } from "../api/config";
import { logger } from "./logger";

/**
 * Executes an asynchronous operation with exponential backoff retry logic.
 * Will retry failed operations that are considered retryable based on PrusaApiError.isRetryable().
 *
 * @param operation - The async operation to execute
 * @param config - Configuration options including retry settings
 * @returns Promise resolving to the operation result
 * @throws The last error encountered if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await api.getData(),
 *   { maxRetries: 3, initialRetryDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(operation: () => Promise<T>, config: PrusaClientConfig): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialRetryDelay ?? 1000;
  const maxRetries = config.maxRetries ?? 3;
  const maxDelay = config.maxRetryDelay ?? 8000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (!PrusaApiError.isRetryable(error)) {
        throw error;
      }

      logger.debug(`Retry attempt ${attempt + 1} after ${delay}ms`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  // This will only be reached if all retries failed
  if (lastError) {
    throw lastError;
  }

  // This should never happen, but TypeScript requires it
  throw new Error("All retries failed without an error");
}
