// Centralized error handling utility for iOS Apps extension
import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { logger } from "./logger";

/**
 * Sanitize query strings to remove potentially sensitive information before logging
 * @param query The query string to sanitize
 * @returns Sanitized query string safe for logging
 */
export function sanitizeQuery(query: string): string {
  // Remove common sensitive patterns
  return query
    .replace(/token[=:]\s*[^\s&]+/gi, "token=***")
    .replace(/key[=:]\s*[^\s&]+/gi, "key=***")
    .replace(/password[=:]\s*[^\s&]+/gi, "password=***")
    .replace(/auth[=:]\s*[^\s&]+/gi, "auth=***")
    .replace(/bearer\s+[^\s&]+/gi, "bearer ***")
    .replace(/[a-f0-9]{32,}/gi, "***") // Remove long hex strings (potential tokens/hashes)
    .replace(/[A-Za-z0-9+/]{20,}={0,2}/g, "***"); // Remove base64-like strings
}

/**
 * Handle errors consistently across all tools
 * @param error The error that occurred
 * @param context Context string to identify where the error occurred (e.g., "get-app-details tool")
 * @param userMessage User-friendly message to show in toast
 * @param shouldThrow Whether to throw the error after logging and showing toast (default: true)
 */
export async function handleToolError(
  error: unknown,
  context: string,
  userMessage: string,
  shouldThrow: boolean = true,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log the error with context
  logger.error(`[${context}] Error: ${errorMessage}`);

  // Show user-friendly toast
  await showFailureToast(error instanceof Error ? error : new Error(errorMessage), { title: userMessage });

  // Optionally throw the error for further handling
  if (shouldThrow) {
    throw new Error(`${userMessage}: ${errorMessage}`);
  }
}

/**
 * Handle app search/lookup errors specifically
 * @param error The error that occurred
 * @param query The search query that failed
 * @param toolName Name of the tool that failed
 */
export async function handleAppSearchError(error: unknown, query: string, toolName: string): Promise<void> {
  const sanitizedQuery = sanitizeQuery(query);
  await handleToolError(error, `${toolName} tool`, `Failed to find app "${sanitizedQuery}"`, true);
}

/**
 * Handle download/file operation errors
 * @param error The error that occurred
 * @param operation Description of the operation that failed
 * @param toolName Name of the tool that failed
 */
export async function handleDownloadError(error: unknown, operation: string, toolName: string): Promise<void> {
  const sanitizedOperation = sanitizeQuery(operation);
  await handleToolError(error, `${toolName} tool`, `Failed to ${sanitizedOperation}`, true);
}

/**
 * Handle authentication errors with enhanced detection and user guidance
 * @param error The error that occurred
 * @param shouldThrow Whether to throw after handling (default: true)
 * @param showPreferencesAction Whether to show action to open preferences (default: true)
 * @param redirectToAuthForm Optional function to redirect to auth form instead of preferences
 */
export async function handleAuthError(
  error: unknown,
  shouldThrow: boolean = true,
  showPreferencesAction: boolean = true,
  redirectToAuthForm?: (initialError?: string) => void,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log the error with context
  logger.error(`[authentication] Error: ${errorMessage}`);

  // Detect specific authentication error types
  const lowerErrorMessage = errorMessage.toLowerCase();
  const isCredentialError =
    lowerErrorMessage.includes("authentication failed") ||
    lowerErrorMessage.includes("invalid credentials") ||
    lowerErrorMessage.includes("login failed");

  const is2FARequired =
    lowerErrorMessage.includes("two-factor") ||
    lowerErrorMessage.includes("2fa") ||
    lowerErrorMessage.includes("verification code");

  let userMessage = "Authentication failed";
  let toastTitle = "Authentication Error";

  if (is2FARequired) {
    userMessage = "Two-factor authentication required";
    toastTitle = "2FA Required";
  } else if (isCredentialError) {
    userMessage = "Invalid Apple ID credentials";
    toastTitle = "Login Failed";
  }

  // Show user-friendly toast with specific guidance
  if (redirectToAuthForm) {
    // Redirect to auth form instead of showing preferences toast
    await showToast({
      style: Toast.Style.Failure,
      title: toastTitle,
      message: `${userMessage}. Redirecting to sign-in form...`,
    });

    // Redirect to auth form with the error message
    redirectToAuthForm(errorMessage);
  } else {
    // Show traditional preferences toast
    await showToast({
      style: Toast.Style.Failure,
      title: toastTitle,
      message: `${userMessage}. Please check your Apple ID settings.`,
      primaryAction: showPreferencesAction
        ? {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          }
        : undefined,
    });
  }

  // Optionally throw the error for further handling
  if (shouldThrow) {
    throw new Error(`${userMessage}: ${errorMessage}`);
  }
}
