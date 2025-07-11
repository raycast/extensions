// Centralized error handling utility for iOS Apps extension
import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { logger } from "./logger";

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
  await showToast(Toast.Style.Failure, "Error", `${userMessage}: ${errorMessage}`);

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
  await handleToolError(error, `${toolName} tool`, `Failed to find app "${query}"`, true);
}

/**
 * Handle download/file operation errors
 * @param error The error that occurred
 * @param operation Description of the operation that failed
 * @param toolName Name of the tool that failed
 */
export async function handleDownloadError(error: unknown, operation: string, toolName: string): Promise<void> {
  await handleToolError(error, `${toolName} tool`, `Failed to ${operation}`, true);
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
  const isCredentialError =
    errorMessage.toLowerCase().includes("authentication failed") ||
    errorMessage.toLowerCase().includes("invalid credentials") ||
    errorMessage.toLowerCase().includes("login failed");

  const is2FARequired =
    errorMessage.toLowerCase().includes("two-factor") ||
    errorMessage.toLowerCase().includes("2fa") ||
    errorMessage.toLowerCase().includes("verification code");

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
