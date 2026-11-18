import { showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";

/**
 * Error types that can occur in the extension
 */
export enum ErrorType {
  API_KEY_MISSING = "API_KEY_MISSING",
  API_KEY_INVALID = "API_KEY_INVALID",
  RATE_LIMIT = "RATE_LIMIT",
  NETWORK = "NETWORK",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION = "PERMISSION",
  NO_MEDIA = "NO_MEDIA",
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  FILE_SYSTEM = "FILE_SYSTEM",
  VALIDATION = "VALIDATION",
  UNKNOWN = "UNKNOWN",
}

/**
 * User-friendly error messages mapped to error types
 */
const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  [ErrorType.API_KEY_MISSING]: {
    title: "API Key Required",
    message: "Please set your Fathom API Key in Extension Preferences.",
  },
  [ErrorType.API_KEY_INVALID]: {
    title: "Invalid API Key",
    message: "Please check your Fathom API Key in Extension Preferences.",
  },
  [ErrorType.RATE_LIMIT]: {
    title: "Too Many Requests",
    message: "Please wait a moment and try again.",
  },
  [ErrorType.NETWORK]: {
    title: "Connection Error",
    message: "Unable to connect to Fathom. Please check your internet connection.",
  },
  [ErrorType.NOT_FOUND]: {
    title: "Not Found",
    message: "The requested resource could not be found.",
  },
  [ErrorType.PERMISSION]: {
    title: "Permission Denied",
    message: "You don't have permission to access this resource.",
  },
  [ErrorType.NO_MEDIA]: {
    title: "Nothing to Download",
    message: "This recording has no downloadable media.",
  },
  [ErrorType.DOWNLOAD_FAILED]: {
    title: "Download Failed",
    message: "The recording could not be downloaded. The partial file was kept, so it can resume.",
  },
  [ErrorType.FILE_SYSTEM]: {
    title: "File System Error",
    message: "Unable to read or write file. Please check permissions.",
  },
  [ErrorType.VALIDATION]: {
    title: "Invalid Data",
    message: "The data received was invalid or incomplete.",
  },
  [ErrorType.UNKNOWN]: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
  },
};

/**
 * Classify an error into a specific error type
 */
export function classifyError(error: unknown): ErrorType {
  if (!(error instanceof Error)) {
    return ErrorType.UNKNOWN;
  }

  const message = error.message.toLowerCase();

  // Auth errors
  if (message.includes("api_key_missing") || message.includes("no api key")) {
    return ErrorType.API_KEY_MISSING;
  }
  if (
    message.includes("api_key_invalid") ||
    message.includes("invalid api key") ||
    message.includes("unauthorized") ||
    message.includes("401")
  ) {
    return ErrorType.API_KEY_INVALID;
  }

  // Rate limiting
  if (message.includes("rate limit") || message.includes("429") || message.includes("too many requests")) {
    return ErrorType.RATE_LIMIT;
  }

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("timeout") ||
    message.includes("connection")
  ) {
    return ErrorType.NETWORK;
  }

  // Download-specific conditions. These are checked BEFORE the generic matches
  // below, because "no downloadable media" contains "download" and would
  // otherwise be swallowed by a broader rule.
  if (message.includes("no_media") || message.includes("no downloadable media")) {
    return ErrorType.NO_MEDIA;
  }
  if (message.includes("download_failed") || message.includes("generation_failed")) {
    return ErrorType.DOWNLOAD_FAILED;
  }

  // Not found
  if (message.includes("not found") || message.includes("404")) {
    return ErrorType.NOT_FOUND;
  }

  // Permission errors
  if (message.includes("permission") || message.includes("forbidden") || message.includes("403")) {
    return ErrorType.PERMISSION;
  }

  // File system errors
  if (
    message.includes("enoent") ||
    message.includes("eacces") ||
    message.includes("file") ||
    message.includes("path")
  ) {
    return ErrorType.FILE_SYSTEM;
  }

  // Validation errors
  if (message.includes("validation") || message.includes("invalid") || message.includes("parse")) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message for an error
 */
export function getUserFriendlyError(error: unknown): { title: string; message: string } {
  const errorType = classifyError(error);
  return ERROR_MESSAGES[errorType];
}

/**
 * Show a user-friendly error toast
 *
 * Routed through `showError` from `@chrismessina/raycast-kit` so every failure
 * carries a "Copy Error" action — House Style, and a Store review requirement.
 * An error the user cannot copy is an error they cannot report.
 */
export async function showErrorToast(error: unknown, customTitle?: string): Promise<void> {
  const { title, message } = getUserFriendlyError(error);

  await showError(error, {
    title: customTitle || title,
    // The classified message is friendlier than the raw text; the true cause
    // still reaches the clipboard via the Error's own stack.
    message,
  });

  // Log the actual error for debugging
  logger.error("Error details:", error);
}

/**
 * Show a user-friendly error toast with custom context
 */
export async function showContextualError(
  error: unknown,
  context: {
    action: string; // e.g., "export meeting", "load summary"
    fallbackTitle?: string;
    fallbackMessage?: string;
  },
): Promise<void> {
  const errorType = classifyError(error);
  const { message } = ERROR_MESSAGES[errorType];

  // Use contextual title if available, otherwise use the classified title
  const finalTitle = context.fallbackTitle || `Failed to ${context.action}`;

  // For known error types, use the standard message
  // For unknown errors, use the fallback message if provided
  const finalMessage = errorType === ErrorType.UNKNOWN && context.fallbackMessage ? context.fallbackMessage : message;

  await showError(error, {
    title: finalTitle,
    message: finalMessage,
    // Names the operation on the clipboard so a bug report says which action
    // failed, without lengthening the toast.
    copyContext: `Action: ${context.action}`,
  });

  // Log the actual error for debugging
  logger.error(`Error during ${context.action}:`, error);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  context: {
    action: string;
    fallbackTitle?: string;
    fallbackMessage?: string;
  },
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await showContextualError(error, context);
      throw error;
    }
  }) as T;
}
