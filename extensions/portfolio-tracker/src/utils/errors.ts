/**
 * Error classification and handling utilities.
 *
 * Classifies errors from Yahoo Finance API calls into categories
 * that determine UI display and retry behaviour:
 *
 * - OFFLINE: Transient network issues — show "Offline" marker, retry later
 * - API_ERROR: Bad requests, 404s, parse failures — show in error display section
 * - UNKNOWN: Catch-all for unexpected errors
 *
 * Pure functions with no side effects. Used by services and hooks.
 */

import { ErrorType, PortfolioError } from "./types";
import { RETRYABLE_STATUS_CODES, OFFLINE_ERROR_CODES } from "./constants";

// ──────────────────────────────────────────
// Error Classification
// ──────────────────────────────────────────

/**
 * Classifies an unknown error into an ErrorType for UI display and retry logic.
 *
 * Classification rules:
 * 1. Network error codes (ECONNRESET, ETIMEDOUT, etc.) → OFFLINE
 * 2. HTTP status codes 408, 429, 500, 502, 503, 504 → OFFLINE
 * 3. TypeError with "fetch" or "network" in message → OFFLINE
 * 4. HTTP 4xx (except retryable ones) → API_ERROR
 * 5. Parse/validation errors → API_ERROR
 * 6. Everything else → UNKNOWN
 *
 * @param error - The caught error (could be anything)
 * @returns The classified ErrorType
 *
 * @example
 * classifyError(new Error("ETIMEDOUT"))  // ErrorType.OFFLINE
 * classifyError({ status: 404 })         // ErrorType.API_ERROR
 */
export function classifyError(error: unknown): ErrorType {
  if (error === null || error === undefined) {
    return ErrorType.UNKNOWN;
  }

  // Handle errors with a `code` property (Node.js network errors)
  if (hasProperty(error, "code") && typeof error.code === "string") {
    if (OFFLINE_ERROR_CODES.has(error.code)) {
      return ErrorType.OFFLINE;
    }
  }

  // Handle errors with an HTTP status code
  const status = extractStatusCode(error);
  if (status !== undefined) {
    if (RETRYABLE_STATUS_CODES.has(status)) {
      return ErrorType.OFFLINE;
    }
    // Non-retryable HTTP errors (400, 401, 403, 404, 422, etc.)
    if (status >= 400) {
      return ErrorType.API_ERROR;
    }
  }

  // Handle TypeError that looks like a network failure
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("abort")) {
      return ErrorType.OFFLINE;
    }
  }

  // Handle generic Error messages that suggest network issues
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const offlinePatterns = [
      "network request failed",
      "network error",
      "failed to fetch",
      "socket hang up",
      "socket timeout",
      "request timeout",
      "econnrefused",
      "econnreset",
      "etimedout",
      "enotfound",
    ];
    if (offlinePatterns.some((pattern) => msg.includes(pattern))) {
      return ErrorType.OFFLINE;
    }

    // Parse / validation errors from yahoo-finance2
    const apiPatterns = [
      "invalid json",
      "unexpected token",
      "not found",
      "no data",
      "validation",
      "invalid symbol",
      "no results",
    ];
    if (apiPatterns.some((pattern) => msg.includes(pattern))) {
      return ErrorType.API_ERROR;
    }
  }

  return ErrorType.UNKNOWN;
}

// ──────────────────────────────────────────
// PortfolioError Construction
// ──────────────────────────────────────────

/**
 * Creates a structured PortfolioError from an unknown caught error.
 *
 * @param error - The caught error
 * @param symbol - Optional symbol that triggered the error
 * @returns A structured PortfolioError for UI display
 *
 * @example
 * try {
 *   await getQuote("INVALID");
 * } catch (err) {
 *   const portfolioError = createPortfolioError(err, "INVALID");
 *   // { type: ErrorType.API_ERROR, message: "...", symbol: "INVALID", timestamp: "..." }
 * }
 */
export function createPortfolioError(error: unknown, symbol?: string): PortfolioError {
  const type = classifyError(error);
  const message = extractErrorMessage(error, type);

  return {
    type,
    message,
    symbol,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extracts a human-readable error message from an unknown error,
 * with fallback messages based on the error type.
 *
 * @param error - The caught error
 * @param type - The classified error type (determines fallback message)
 * @returns A user-friendly error message string
 */
export function extractErrorMessage(error: unknown, type: ErrorType): string {
  // Try to get a message from the error
  if (error instanceof Error && error.message) {
    // Clean up overly technical messages for the user
    const msg = error.message;

    // Don't expose raw stack traces or very long messages
    if (msg.length > 200) {
      return msg.slice(0, 200) + "...";
    }

    return msg;
  }

  if (typeof error === "string") {
    return error;
  }

  // Fallback messages by type
  switch (type) {
    case ErrorType.OFFLINE:
      return "Unable to connect. Check your internet connection.";
    case ErrorType.API_ERROR:
      return "Failed to fetch data from the market data provider.";
    case ErrorType.UNKNOWN:
    default:
      return "An unexpected error occurred.";
  }
}

// ──────────────────────────────────────────
// Error State Helpers
// ──────────────────────────────────────────

/**
 * Checks whether an error is retryable (transient network issue).
 *
 * @param error - A PortfolioError or raw error
 * @returns true if the error is transient and worth retrying
 */
export function isRetryableError(error: PortfolioError | unknown): boolean {
  if (isPortfolioError(error)) {
    return error.type === ErrorType.OFFLINE;
  }
  return classifyError(error) === ErrorType.OFFLINE;
}

/**
 * Checks whether an error indicates the user is offline.
 *
 * @param error - A PortfolioError or raw error
 * @returns true if the error is an offline/network error
 */
export function isOfflineError(error: PortfolioError | unknown): boolean {
  if (isPortfolioError(error)) {
    return error.type === ErrorType.OFFLINE;
  }
  return classifyError(error) === ErrorType.OFFLINE;
}

// ──────────────────────────────────────────
// Type Guards
// ──────────────────────────────────────────

/**
 * Type guard: checks if a value is a PortfolioError.
 */
export function isPortfolioError(value: unknown): value is PortfolioError {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "message" in value &&
    "timestamp" in value &&
    Object.values(ErrorType).includes((value as PortfolioError).type)
  );
}

// ──────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────

/**
 * Type-safe property check for unknown objects.
 */
function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}

/**
 * Attempts to extract an HTTP status code from an error object.
 * Handles various error shapes from fetch, yahoo-finance2, etc.
 *
 * @param error - The error to inspect
 * @returns The HTTP status code, or undefined if not found
 */
function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  // Direct `status` property (fetch Response-like)
  if (hasProperty(error, "status") && typeof error.status === "number") {
    return error.status;
  }

  // `statusCode` property (some HTTP libraries)
  if (hasProperty(error, "statusCode") && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  // Nested in `response` (axios-style)
  if (hasProperty(error, "response")) {
    return extractStatusCode(error.response);
  }

  return undefined;
}
