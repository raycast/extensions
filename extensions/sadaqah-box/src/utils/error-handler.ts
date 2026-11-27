/**
 * Centralized error handling
 * Categorizes errors and sanitizes messages for user display
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
 * Typed HTTP error thrown by the API client
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function categorizeStatus(status: number, message?: string): AppError {
  switch (status) {
    case 401:
    case 403:
      return {
        category: "auth",
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: status,
      };
    case 404:
      return {
        category: "not_found",
        message: ERROR_MESSAGES.NOT_FOUND,
        statusCode: status,
      };
    case 400:
    case 422:
      return {
        category: "validation",
        message: message || ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: status,
      };
    case 429:
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        category: "server",
        message: ERROR_MESSAGES.SERVER_ERROR,
        statusCode: status,
      };
    default:
      return {
        category: status >= 500 ? "server" : "unknown",
        message: status >= 500 ? ERROR_MESSAGES.SERVER_ERROR : message || ERROR_MESSAGES.UNKNOWN_ERROR,
        statusCode: status,
      };
  }
}

/**
 * Categorize and sanitize errors for user display
 */
export function handleError(error: unknown): AppError {
  // Check structured HTTP status before generic Error handling
  if (error instanceof ApiError) {
    return {
      ...categorizeStatus(error.status, error.message),
      originalError: error,
    };
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    const err = error as { status?: unknown; message?: unknown };
    if (typeof err.status === "number") {
      return {
        ...categorizeStatus(err.status, typeof err.message === "string" ? err.message : undefined),
        originalError: error instanceof Error ? error : undefined,
      };
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (error.name === "AbortError" || msg.includes("timeout")) {
      return {
        category: "timeout",
        message: ERROR_MESSAGES.TIMEOUT_ERROR,
        originalError: error,
      };
    }

    if (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("econnreset")
    ) {
      return {
        category: "network",
        message: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
      };
    }

    if (msg.includes("unauthorized") || msg.includes("authentication") || msg.includes("api key")) {
      return {
        category: "auth",
        message: ERROR_MESSAGES.UNAUTHORIZED,
        originalError: error,
      };
    }

    if (msg.includes("invalid api host url")) {
      return {
        category: "validation",
        message: error.message,
        originalError: error,
      };
    }

    return {
      category: "unknown",
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
    };
  }

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
 * Check if error is transient and safe to retry for idempotent requests
 */
export function isRetryableError(error: AppError): boolean {
  return error.category === "network" || error.category === "timeout" || error.category === "server";
}
