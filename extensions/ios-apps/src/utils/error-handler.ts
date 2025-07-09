// Centralized error handling utility for iOS Apps extension
import { showToast, Toast } from "@raycast/api";
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
export async function handleAppSearchError(
  error: unknown,
  query: string,
  toolName: string,
): Promise<void> {
  await handleToolError(
    error,
    `${toolName} tool`,
    `Failed to find app "${query}"`,
    true,
  );
}

/**
 * Handle download/file operation errors
 * @param error The error that occurred
 * @param operation Description of the operation that failed
 * @param toolName Name of the tool that failed
 */
export async function handleDownloadError(
  error: unknown,
  operation: string,
  toolName: string,
): Promise<void> {
  await handleToolError(
    error,
    `${toolName} tool`,
    `Failed to ${operation}`,
    true,
  );
}

/**
 * Handle authentication errors
 * @param error The error that occurred
 * @param shouldThrow Whether to throw after handling (default: true)
 */
export async function handleAuthError(
  error: unknown,
  shouldThrow: boolean = true,
): Promise<void> {
  await handleToolError(
    error,
    "authentication",
    "Authentication failed",
    shouldThrow,
  );
}
