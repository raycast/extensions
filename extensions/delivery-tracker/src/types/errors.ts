/**
 * Base class for tracking-related errors
 */
export class TrackingError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "TrackingError";
  }
}

/**
 * Error categories for better user guidance
 */
export enum ErrorCategory {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  INVALID_TRACKING = "invalid_tracking",
  CARRIER_API = "carrier_api",
  UNKNOWN = "unknown",
}

/**
 * Network-related errors (connection, timeout, DNS)
 */
export class NetworkError extends TrackingError {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message, ErrorCategory.NETWORK, "Network connection issue. Check your internet connection and try again.");
  }
}

/**
 * Authentication/authorization errors
 */
export class AuthenticationError extends TrackingError {
  constructor(message: string) {
    super(
      message,
      ErrorCategory.AUTHENTICATION,
      "Authentication failed. Please check your API credentials in settings.",
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends TrackingError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    const userMsg = retryAfter
      ? `Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
      : "Rate limit exceeded. Please try again later.";
    super(message, ErrorCategory.RATE_LIMIT, userMsg);
  }
}

/**
 * Invalid tracking number errors
 */
export class InvalidTrackingError extends TrackingError {
  constructor(
    message: string,
    public readonly trackingNumber: string,
  ) {
    super(
      message,
      ErrorCategory.INVALID_TRACKING,
      "Invalid tracking number. Please verify the tracking number is correct.",
    );
  }
}

/**
 * Carrier API errors (4xx/5xx responses)
 */
export class CarrierAPIError extends TrackingError {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message, ErrorCategory.CARRIER_API, "Carrier API error. The service may be temporarily unavailable.");
  }
}

/**
 * Categorizes an unknown error into a TrackingError
 */
export function categorizeError(error: unknown, deliveryName: string): TrackingError {
  // Already a TrackingError
  if (error instanceof TrackingError) {
    return error;
  }

  const errorMessage = String(error);
  const errorLower = errorMessage.toLowerCase();

  // Network errors
  if (
    errorLower.includes("network") ||
    errorLower.includes("econnrefused") ||
    errorLower.includes("enotfound") ||
    errorLower.includes("timeout") ||
    errorLower.includes("etimedout") ||
    errorLower.includes("fetch failed") ||
    errorLower.includes("connection")
  ) {
    return new NetworkError(errorMessage, error instanceof Error ? error : undefined);
  }

  // Authentication errors
  if (
    errorLower.includes("unauthorized") ||
    errorLower.includes("401") ||
    errorLower.includes("403") ||
    errorLower.includes("forbidden") ||
    errorLower.includes("authentication") ||
    errorLower.includes("invalid credentials") ||
    errorLower.includes("api key")
  ) {
    return new AuthenticationError(errorMessage);
  }

  // Rate limit errors
  if (errorLower.includes("rate limit") || errorLower.includes("429") || errorLower.includes("too many requests")) {
    // Try to extract retry-after time if present
    const retryMatch = errorMessage.match(/retry.*?(\d+)/i);
    const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : undefined;
    return new RateLimitError(errorMessage, retryAfter);
  }

  // Invalid tracking number
  if (
    errorLower.includes("invalid tracking") ||
    errorLower.includes("tracking number not found") ||
    errorLower.includes("not found") ||
    errorLower.includes("404")
  ) {
    return new InvalidTrackingError(errorMessage, deliveryName);
  }

  // Carrier API errors (HTTP status codes)
  const statusMatch = errorMessage.match(/\b([45]\d{2})\b/);
  if (statusMatch) {
    return new CarrierAPIError(errorMessage, parseInt(statusMatch[1], 10));
  }

  // Unknown error
  return new TrackingError(errorMessage, ErrorCategory.UNKNOWN, "An unexpected error occurred. Please try again.");
}

/**
 * Formats error messages for display
 */
export interface ErrorSummary {
  totalErrors: number;
  byCategory: Map<ErrorCategory, string[]>;
  userMessage: string;
}

export function summarizeErrors(errors: TrackingError[]): ErrorSummary {
  const byCategory = new Map<ErrorCategory, string[]>();

  for (const error of errors) {
    const existing = byCategory.get(error.category) || [];
    existing.push(error.message);
    byCategory.set(error.category, existing);
  }

  // Generate user-friendly message based on error categories
  let userMessage = "";
  const categories = Array.from(byCategory.keys());

  if (categories.length === 1) {
    // Single category - use its specific message
    userMessage = errors[0].userMessage;
  } else if (byCategory.has(ErrorCategory.NETWORK)) {
    userMessage = "Network issues detected. Check your connection and try again.";
  } else if (byCategory.has(ErrorCategory.RATE_LIMIT)) {
    userMessage = "Rate limits exceeded. Please wait before refreshing.";
  } else {
    userMessage = "Multiple errors occurred. Check console for details.";
  }

  return {
    totalErrors: errors.length,
    byCategory,
    userMessage,
  };
}
