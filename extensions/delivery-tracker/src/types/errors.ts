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
 * User-friendly messages for each error category
 */
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.NETWORK]: "Network connection issue. Check your internet connection and try again.",
  [ErrorCategory.AUTHENTICATION]: "Authentication failed. Please check your API credentials in settings.",
  [ErrorCategory.RATE_LIMIT]: "Rate limit exceeded. Please try again later.",
  [ErrorCategory.INVALID_TRACKING]: "Invalid tracking number. Please verify the tracking number is correct.",
  [ErrorCategory.CARRIER_API]: "Carrier API error. The service may be temporarily unavailable.",
  [ErrorCategory.UNKNOWN]: "An unexpected error occurred. Please try again.",
};

/**
 * Tracking error with automatic categorization
 */
export class TrackingError extends Error {
  public readonly category: ErrorCategory;
  public readonly userMessage: string;

  constructor(message: string, category?: ErrorCategory) {
    super(message);
    this.name = "TrackingError";
    this.category = category ?? ErrorCategory.UNKNOWN;
    this.userMessage = ERROR_MESSAGES[this.category];
  }
}

/**
 * Categorizes an unknown error into a TrackingError
 */
export function categorizeError(error: unknown): TrackingError {
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
    return new TrackingError(errorMessage, ErrorCategory.NETWORK);
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
    return new TrackingError(errorMessage, ErrorCategory.AUTHENTICATION);
  }

  // Rate limit errors
  if (errorLower.includes("rate limit") || errorLower.includes("429") || errorLower.includes("too many requests")) {
    return new TrackingError(errorMessage, ErrorCategory.RATE_LIMIT);
  }

  // Invalid tracking number
  if (
    errorLower.includes("invalid tracking") ||
    errorLower.includes("tracking number not found") ||
    errorLower.includes("not found") ||
    errorLower.includes("404")
  ) {
    return new TrackingError(errorMessage, ErrorCategory.INVALID_TRACKING);
  }

  // Carrier API errors (HTTP status codes)
  if (/\b([45]\d{2})\b/.test(errorMessage)) {
    return new TrackingError(errorMessage, ErrorCategory.CARRIER_API);
  }

  // Unknown error
  return new TrackingError(errorMessage, ErrorCategory.UNKNOWN);
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
