/**
 * Centralized error handling
 * Sanitizes errors for user display and provides proper error categorization
 */

import { ERROR_MESSAGES } from "../constants";

export type ErrorCategory = "network" | "timeout" | "auth" | "not_found" | "validation" | "server" | "unknown";

export interface AppError {
  category: ErrorCategory;
  message: string;
  originalError?: Error;
  statusCode?: number;
}

/**
 * Categorize and sanitize errors for user display
 */
export function handleError(error: unknown): AppError {
  // Handle native Error objects
  if (error instanceof Error) {
    // Timeout errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return {
        category: "timeout",
        message: ERROR_MESSAGES.TIMEOUT_ERROR,
        originalError: error,
      };
    }

    // Network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("ECONNREFUSED")
    ) {
      return {
        category: "network",
        message: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
      };
    }

    // Auth errors (from API responses)
    if (error.message.includes("unauthorized") || error.message.includes("authentication")) {
      return {
        category: "auth",
        message: ERROR_MESSAGES.UNAUTHORIZED,
        originalError: error,
      };
    }

    // Default: unknown error with sanitized message
    return {
      category: "unknown",
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
    };
  }

  // Handle HTTP response errors
  if (typeof error === "object" && error !== null) {
    const err = error as { status?: number; message?: string };

    if (err.status) {
      switch (err.status) {
        case 401:
          return {
            category: "auth",
            message: ERROR_MESSAGES.UNAUTHORIZED,
            statusCode: 401,
          };
        case 404:
          return {
            category: "not_found",
            message: ERROR_MESSAGES.NOT_FOUND,
            statusCode: 404,
          };
        case 422:
          return {
            category: "validation",
            message: err.message || ERROR_MESSAGES.VALIDATION_ERROR,
            statusCode: 422,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            category: "server",
            message: ERROR_MESSAGES.SERVER_ERROR,
            statusCode: err.status,
          };
      }
    }
  }

  // Fallback for unknown error types
  return {
    category: "unknown",
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  return handleError(error).message;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  return error.category === "network" || error.category === "timeout" || error.category === "server";
}
