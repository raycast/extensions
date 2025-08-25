// Centralized error handling utility for iOS Apps extension
import { showToast, Toast, openExtensionPreferences, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { logger } from "./logger";
import { analyzeIpatoolError } from "./ipatool-error-patterns";
import { loginToAppleId, NeedsLoginError, Needs2FAError } from "./auth";

/**
 * Sanitize query strings to remove potentially sensitive information before logging
 * @param query The query string to sanitize
 * @returns Sanitized query string safe for logging
 */
export function sanitizeQuery(query: string): string {
  // Remove common sensitive patterns
  return (
    query
      .replace(/token[=:]\s*[^\s&]+/gi, "token=***")
      .replace(/key[=:]\s*[^\s&]+/gi, "key=***")
      .replace(/password[=:]\s*[^\s&]+/gi, "password=***")
      .replace(/auth[=:]\s*[^\s&]+/gi, "auth=***")
      .replace(/bearer\s+[^\s&]+/gi, "bearer ***")
      // Redact CLI-style flags with values (handle quoted values)
      .replace(/(?:^|\s)(-p|--password)\s+("[^"]*"|'[^']*'|\S+)/gi, " $1 ***")
      .replace(/(?:^|\s)(-e|--email|--username)\s+("[^"]*"|'[^']*'|\S+)/gi, " $1 ***")
      .replace(/(?:^|\s)(--auth-code|--2fa|--otp|--code)\s+("[^"]*"|'[^']*'|\S+)/gi, " $1 ******")
      .replace(/[a-f0-9]{32,}/gi, "***") // Remove long hex strings (potential tokens/hashes)
      .replace(/[A-Za-z0-9+/]{20,}={0,2}/g, "***")
  ); // Remove base64-like strings
}

/**
 * Handle suggested actions from error patterns
 * @param action The suggested action to handle
 */
async function handleSuggestedAction(action: string): Promise<void> {
  switch (action) {
    case "Retry":
      // For retry actions, we could potentially re-run the last command
      // but for now, we'll just show a helpful message
      await showToast({
        style: Toast.Style.Success,
        title: "Please retry the operation",
        message: "Try running the command again",
      });
      break;

    case "Open Disk Usage":
      // Open the built-in Disk Utility or Storage settings
      try {
        await open("x-apple.systempreferences:com.apple.preference.general?Storage");
      } catch {
        // Fallback to opening About This Mac storage view
        try {
          await open("/System/Applications/Utilities/Disk Utility.app");
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Cannot open disk utility",
            message: "Please manually check your disk space in System Preferences > Storage",
          });
        }
      }
      break;

    case "Change Location":
      await showToast({
        style: Toast.Style.Success,
        title: "Change download location",
        message: "Try downloading to a different folder with write permissions",
      });
      break;

    case "Open Preferences":
      await openExtensionPreferences();
      break;

    default:
      // Generic action - just show the action text as guidance
      await showToast({
        style: Toast.Style.Success,
        title: action,
        message: "Please follow this suggestion to resolve the issue",
      });
      break;
  }
}

/**
 * Handle errors consistently across all tools
 * @param error The error that occurred
 * @param context Context string to identify where the error occurred (e.g., "get-app-details tool")
 * @param userMessage User-friendly message to show in toast
 * @param shouldThrow Whether to throw the error after logging and showing toast (default: true)
 * @param suggestedAction Optional action text for toast primary action
 */
export async function handleToolError(
  error: unknown,
  context: string,
  userMessage: string,
  shouldThrow: boolean = true,
  suggestedAction?: string,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log the error with context
  logger.error(`[${context}] Error: ${errorMessage}`);

  // Show user-friendly toast with optional action
  if (suggestedAction) {
    await showToast({
      style: Toast.Style.Failure,
      title: userMessage,
      message: errorMessage,
      primaryAction: {
        title: suggestedAction,
        onAction: () => handleSuggestedAction(suggestedAction),
      },
    });
  } else {
    await showFailureToast(error instanceof Error ? error : new Error(errorMessage), { title: userMessage });
  }

  // Optionally throw the error for further handling
  if (shouldThrow) {
    throw new Error(`${userMessage}: ${errorMessage}`);
  }
}

/**
 * Handle errors with intelligent analysis using ipatool error patterns
 * @param error The error that occurred
 * @param context Context string to identify where the error occurred
 * @param stderr Optional stderr content from the process
 * @param operationContext Optional context about what operation was being performed
 * @param shouldThrow Whether to throw the error after logging and showing toast (default: true)
 */
export async function handleIpatoolError(
  error: unknown,
  context: string,
  stderr?: string,
  operationContext?: "auth" | "download" | "search",
  shouldThrow: boolean = true,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Analyze the error using our pattern matching
  const analysis = analyzeIpatoolError(errorMessage, stderr, operationContext);

  // Use the appropriate handler based on error type
  if (analysis.isAuthError) {
    await handleAuthError(error, shouldThrow);
  } else {
    // Use the enhanced error handling with suggested actions
    await handleToolError(error, context, analysis.userMessage, shouldThrow, analysis.suggestedAction);
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
 * @param suggestedAction Optional action text for toast primary action
 */
export async function handleDownloadError(
  error: unknown,
  operation: string,
  toolName: string,
  suggestedAction?: string,
): Promise<void> {
  const sanitizedOperation = sanitizeQuery(operation);
  await handleToolError(error, `${toolName} tool`, `Failed to ${sanitizedOperation}`, true, suggestedAction);
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
  pushLoginForm?: (onSuccess?: () => void) => void,
  push2FAForm?: (onSuccess?: () => void) => void,
  onAuthSuccess?: () => void,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log the error with context
  logger.error(`[authentication] Error: ${errorMessage}`);

  // Check if error is a specific custom error type
  const isNeedsLoginError = error instanceof NeedsLoginError;
  const isNeeds2FAError = error instanceof Needs2FAError;

  // Detect specific authentication error types from message
  const lowerErrorMessage = errorMessage.toLowerCase();
  const isCredentialError =
    isNeedsLoginError ||
    lowerErrorMessage.includes("authentication failed") ||
    lowerErrorMessage.includes("invalid credentials") ||
    lowerErrorMessage.includes("login failed") ||
    lowerErrorMessage.includes("please provide apple id");

  const is2FARequired =
    isNeeds2FAError ||
    lowerErrorMessage.includes("two-factor") ||
    lowerErrorMessage.includes("2fa") ||
    lowerErrorMessage.includes("verification code");

  const userMessage = "Authentication failed";
  const toastTitle = "Authentication Error";

  if (isCredentialError && pushLoginForm) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Login Failed",
      message: "Redirecting to login form...",
    });
    pushLoginForm(async () => {
      try {
        await loginToAppleId();
        await showToast({ style: Toast.Style.Success, title: "Logged in successfully" });
        // Call the success callback to resume the original operation
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      } catch (loginError) {
        await handleAuthError(loginError, true, true, undefined, pushLoginForm, push2FAForm, onAuthSuccess);
      }
    });
    return;
  } else if (is2FARequired && push2FAForm) {
    await showToast({
      style: Toast.Style.Failure,
      title: "2FA Required",
      message: "Redirecting to 2FA form...",
    });
    push2FAForm(async () => {
      try {
        await loginToAppleId();
        await showToast({ style: Toast.Style.Success, title: "2FA successful" });
        // Call the success callback to resume the original operation
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      } catch (loginError) {
        await handleAuthError(loginError, true, true, undefined, pushLoginForm, push2FAForm, onAuthSuccess);
      }
    });
    return;
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
