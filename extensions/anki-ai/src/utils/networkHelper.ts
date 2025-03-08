import { Logger } from "./logger";

/**
 * Interface for retry configurations
 */
interface RetryOptions {
  /** Maximum number of attempts */
  maxRetries?: number;
  /** Initial delay between attempts (ms) */
  baseDelay?: number;
  /** Multiplication factor for exponential backoff */
  backoffFactor?: number;
  /** Timeout for each attempt (ms) */
  timeout?: number;
  /** Whether to add increasing timeout per attempt (ms) */
  additionalTimeoutPerRetry?: number;
  /** Filter for errors that should cause retry */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Class to assist with network operations, including retries
 */
export class NetworkHelper {
  /**
   * Executes a function with automatic retry in case of error
   * Implements exponential backoff to space out attempts
   *
   * @param fn Asynchronous function to be executed
   * @param options Retry configurations
   * @returns Result of the function
   * @throws Error if all attempts fail
   */
  static async withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelay ?? 2000;
    const backoffFactor = options.backoffFactor ?? 2;
    const timeout = options.timeout ?? 60000;
    const additionalTimeoutPerRetry = options.additionalTimeoutPerRetry ?? 30000;

    // Default function to decide whether to retry
    const defaultShouldRetry = (error: Error): boolean => {
      const errorMsg = error.message.toLowerCase();
      return (
        errorMsg.includes("timeout") ||
        errorMsg.includes("504") ||
        errorMsg.includes("gateway timeout") ||
        errorMsg.includes("econnreset") ||
        errorMsg.includes("socket hang up") ||
        errorMsg.includes("network") ||
        errorMsg.includes("connection")
      );
    };

    const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Calculate dynamic timeout for this attempt
        const currentTimeout = timeout + attempt * additionalTimeoutPerRetry;

        // If not the first attempt, log retry information
        if (attempt > 0) {
          Logger.info(`Attempt ${attempt}/${maxRetries} (timeout: ${currentTimeout / 1000}s)`);
        }

        // Execute the function with a timeout
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${currentTimeout / 1000} seconds`)), currentTimeout),
          ),
        ]);

        return result;
      } catch (error) {
        const currentError = error instanceof Error ? error : new Error(String(error));
        lastError = currentError;

        const isRetryable = shouldRetry(currentError);
        const hasMoreAttempts = attempt < maxRetries;

        if (isRetryable && hasMoreAttempts) {
          // Calculate delay with exponential backoff
          const delay = baseDelay * Math.pow(backoffFactor, attempt);
          Logger.warn(
            `Recoverable error, trying again in ${delay / 1000} seconds (${attempt + 1}/${maxRetries}): ${currentError.message}`,
          );

          // Wait before next attempt
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If we got here, there are no more attempts or the error is not recoverable
        Logger.error(
          `Error ${isRetryable ? "recoverable, but exceeded attempts" : "not recoverable"}: ${currentError.message}`,
        );
        throw currentError;
      }
    }

    // This code should never be reached, but is necessary to satisfy TypeScript
    throw lastError || new Error("Failure after multiple attempts");
  }

  /**
   * Checks if an error is related to timeout or network
   * @param error Error to check
   * @returns true if the error is related to timeout or network
   */
  static isNetworkError(error: Error): boolean {
    const errorMsg = error.message.toLowerCase();
    return (
      errorMsg.includes("timeout") ||
      errorMsg.includes("504") ||
      errorMsg.includes("gateway timeout") ||
      errorMsg.includes("econnreset") ||
      errorMsg.includes("socket hang up") ||
      errorMsg.includes("network") ||
      errorMsg.includes("connection")
    );
  }

  /**
   * Formats an error message to be more user-friendly
   * @param error Original error
   * @returns Formatted message
   */
  static formatErrorMessage(error: Error): string {
    const errorMsg = error.message.toLowerCase();

    if (errorMsg.includes("504") || errorMsg.includes("gateway timeout") || errorMsg.includes("timeout")) {
      return "Timeout while communicating with the service. The service may be congested or temporarily unavailable. Please try again later.";
    }

    if (
      errorMsg.includes("network") ||
      errorMsg.includes("connection") ||
      errorMsg.includes("econnreset") ||
      errorMsg.includes("socket hang up")
    ) {
      return "Network connection error. Check your internet connection and try again.";
    }

    return error.message;
  }
}
