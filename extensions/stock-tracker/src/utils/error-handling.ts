import { showToast, Toast } from "@raycast/api";
import { Translations } from "../locales";

/**
 * Common error handling utilities
 */

export interface ErrorHandlerOptions {
  title?: string;
  message?: string;
  translations?: Translations;
  silent?: boolean;
}

/**
 * Handles errors with toast notifications
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): void {
  if (options.silent) {
    return;
  }

  const { title, message, translations } = options;
  const errorTitle = title || translations?.common.error || "Error";
  const errorMessage = message || translations?.common.error || "An error occurred";

  showToast({
    style: Toast.Style.Failure,
    title: errorTitle,
    message: errorMessage,
  });
}

/**
 * Shows success toast
 */
export function showSuccessToast(title: string, message?: string): void {
  showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

/**
 * Validates non-empty string
 */
export function validateNonEmpty(value: string | undefined | null, fieldName = "Field"): string | null {
  if (!value?.trim()) {
    return `${fieldName} cannot be empty`;
  }
  return null;
}
