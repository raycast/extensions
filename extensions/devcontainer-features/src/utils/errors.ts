/**
 * Error codes for the application
 */
export type ErrorCode =
  | "NETWORK_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "CACHE_CORRUPTION"
  | "INVALID_RESPONSE"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "UNKNOWN";

/**
 * Application error structure
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  details?: unknown;
  httpStatus?: number;
}

/**
 * Error message mappings
 */
const ERROR_MESSAGES: Record<
  ErrorCode,
  { userMessage: string; retryable: boolean }
> = {
  NETWORK_ERROR: {
    userMessage: "Unable to connect. Please check your internet connection.",
    retryable: true,
  },
  RATE_LIMIT_EXCEEDED: {
    userMessage:
      "API rate limit exceeded. Please try again later or add a GitHub token in preferences.",
    retryable: false,
  },
  CACHE_CORRUPTION: {
    userMessage:
      "Cache data was corrupted and has been cleared. Please refresh.",
    retryable: true,
  },
  INVALID_RESPONSE: {
    userMessage: "Received unexpected data from server.",
    retryable: true,
  },
  NOT_FOUND: {
    userMessage: "The requested resource was not found.",
    retryable: false,
  },
  UNAUTHORIZED: {
    userMessage: "Authentication failed. Please check your credentials.",
    retryable: false,
  },
  FORBIDDEN: {
    userMessage:
      "Access denied. You do not have permission to access this resource.",
    retryable: false,
  },
  TIMEOUT: {
    userMessage: "Request timed out. Please try again.",
    retryable: true,
  },
  SERVER_ERROR: {
    userMessage: "Server error occurred. Please try again later.",
    retryable: true,
  },
  UNKNOWN: {
    userMessage: "An unexpected error occurred.",
    retryable: true,
  },
};

/**
 * Create an application error
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  details?: unknown,
  httpStatus?: number,
): AppError {
  const { userMessage, retryable } = ERROR_MESSAGES[code];
  return { code, message, userMessage, retryable, details, httpStatus };
}

/**
 * Map HTTP status code to ErrorCode
 */
export function httpStatusToErrorCode(status: number): ErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 408) return "TIMEOUT";
  if (status === 429) return "RATE_LIMIT_EXCEEDED";
  if (status >= 500 && status < 600) return "SERVER_ERROR";
  return "UNKNOWN";
}

/**
 * Create an AppError from HTTP response
 */
export function createHttpError(
  status: number,
  message: string,
  details?: unknown,
): AppError {
  const code = httpStatusToErrorCode(status);
  return createAppError(code, message, details, status);
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(err: unknown): AppError {
  // Already an AppError
  if (isAppError(err)) {
    return err;
  }

  if (err instanceof Error) {
    // Check for network errors
    if (
      err.message.includes("fetch") ||
      err.message.includes("network") ||
      err.name === "TypeError"
    ) {
      return createAppError("NETWORK_ERROR", err.message, err);
    }
    // Check for timeout
    if (err.message.includes("timeout") || err.name === "TimeoutError") {
      return createAppError("TIMEOUT", err.message, err);
    }
    // Check for rate limit
    if (err.message.includes("rate limit")) {
      return createAppError("RATE_LIMIT_EXCEEDED", err.message, err);
    }
    // Check for abort
    if (err.name === "AbortError") {
      return createAppError("TIMEOUT", "Request was aborted", err);
    }
    return createAppError("UNKNOWN", err.message, err);
  }

  return createAppError("UNKNOWN", String(err), err);
}

/**
 * Type guard to check if an object is an AppError
 */
export function isAppError(err: unknown): err is AppError {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    "message" in err &&
    "userMessage" in err &&
    "retryable" in err
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(err: unknown): boolean {
  const appError = isAppError(err) ? err : toAppError(err);
  return appError.retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(err: unknown): string {
  const appError = isAppError(err) ? err : toAppError(err);
  return appError.userMessage;
}

/**
 * Get error code from unknown error
 */
export function getErrorCode(err: unknown): ErrorCode {
  const appError = isAppError(err) ? err : toAppError(err);
  return appError.code;
}
