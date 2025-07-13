/**
 * Custom error class for Prusa API related errors.
 * Includes additional context about the error such as HTTP status code and whether it's retryable.
 */
export class PrusaApiError extends Error {
  /**
   * Creates a new PrusaApiError instance.
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code if applicable
   * @param endpoint - API endpoint that caused the error
   * @param retryable - Whether the operation can be retried
   */
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public retryable?: boolean,
  ) {
    super(message);
    this.name = "PrusaApiError";
  }

  /**
   * Determines if an error should be retried based on its type and status code.
   * Network errors, timeouts, and server errors (5xx) are considered retryable by default.
   * @param error - The error to check
   * @returns Whether the error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof PrusaApiError) {
      // Retry on network errors, timeouts, and 5xx errors
      return error.retryable ?? (error.statusCode ? error.statusCode >= 500 : true);
    }
    return true; // Retry on unknown errors
  }
}

/**
 * Standard error messages used throughout the application.
 * These provide consistent error messaging for common failure scenarios.
 */
export const ERROR_MESSAGES = {
  /** Printer is not responding on the network */
  PRINTER_OFFLINE: "Printer is offline. Please check the connection.",
  /** API key authentication failed */
  INVALID_AUTH: "Invalid API key. Please check your credentials.",
  /** Network connectivity issues */
  NETWORK_ERROR: "Network error. Please check your connection.",
  /** Request exceeded configured timeout */
  TIMEOUT: "Request timed out. The printer is not responding.",
  /** Too many requests in a short period */
  RATE_LIMITED: "Too many requests. Please try again later.",
  /** Printer cannot accept the command now */
  PRINTER_BUSY: "Printer is busy with another operation.",
  /** Unexpected API response format */
  INVALID_RESPONSE: "Invalid response from printer. Please try again.",
  /** Requested resource doesn't exist */
  NOT_FOUND: "Resource not found on printer.",
  /** Internal printer error */
  SERVER_ERROR: "Printer server error. Please check printer status.",
} as const;
