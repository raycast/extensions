import { showToast, Toast } from "@raycast/api";

/**
 * Enhanced error handling utilities for consistent error management across the extension
 */

/**
 * Extracts a meaningful error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}

/**
 * Shows an error toast notification
 */
export function showError(err: unknown, title = "Something went wrong") {
  const message = getErrorMessage(err);
  return showToast({ style: Toast.Style.Failure, title, message });
}

/**
 * Shows a success toast notification
 */
export function showSuccess(title: string, message?: string) {
  return showToast({ style: Toast.Style.Success, title, message });
}

/**
 * Enhanced error handler that logs to console and optionally shows toast
 * @param error - The error to handle
 * @param context - Context about what operation failed
 * @param showToast - Whether to show a toast notification (default: true)
 * @param toastTitle - Custom toast title (optional)
 */
export async function handleError(
  error: unknown,
  context: string,
  showToastNotification = true,
  toastTitle?: string,
): Promise<void> {
  const errorMessage = getErrorMessage(error);

  // Always log to console with context
  console.error(`[${context}] Error:`, error);

  // Optionally show toast notification
  if (showToastNotification) {
    const title = toastTitle || `${context} Failed`;
    await showError(errorMessage, title);
  }
}

/**
 * Wraps an async function with error handling
 * @param fn - The async function to wrap
 * @param context - Context about what operation is being performed
 * @param showToastOnError - Whether to show toast on error (default: true)
 * @param toastTitle - Custom toast title for errors
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string,
  showToastOnError = true,
  toastTitle?: string,
) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error, context, showToastOnError, toastTitle);
      return undefined;
    }
  };
}

/**
 * Wraps a sync function with error handling
 * @param fn - The sync function to wrap
 * @param context - Context about what operation is being performed
 * @param showToastOnError - Whether to show toast on error (default: true)
 * @param toastTitle - Custom toast title for errors
 */
export function withSyncErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => R,
  context: string,
  showToastOnError = true,
  toastTitle?: string,
) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return fn(...args);
    } catch (error) {
      await handleError(error, context, showToastOnError, toastTitle);
      return undefined;
    }
  };
}

/**
 * Creates a standardized error with context
 * @param message - The error message
 * @param context - Context about what operation failed
 * @param originalError - The original error that caused this (optional)
 */
export function createContextualError(message: string, context: string, originalError?: unknown): Error {
  const contextualMessage = `[${context}] ${message}`;
  const error = new Error(contextualMessage);

  if (originalError) {
    error.cause = originalError;
    // Add original error details to the message if available
    const originalMessage = getErrorMessage(originalError);
    if (originalMessage !== message) {
      error.message = `${contextualMessage}: ${originalMessage}`;
    }
  }

  return error;
}

/**
 * Safely executes an async operation with comprehensive error handling
 * @param operation - The async operation to execute
 * @param context - Context about what operation is being performed
 * @param options - Configuration options for error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string,
  options: {
    showToastOnError?: boolean;
    toastTitle?: string;
    fallbackValue?: T;
    rethrow?: boolean;
  } = {},
): Promise<T | undefined> {
  const { showToastOnError = true, toastTitle, fallbackValue, rethrow = false } = options;

  try {
    return await operation();
  } catch (error) {
    await handleError(error, context, showToastOnError, toastTitle);

    if (rethrow) {
      throw createContextualError(getErrorMessage(error), context, error);
    }

    return fallbackValue;
  }
}
