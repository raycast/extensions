/**
 * Authentication error handling utilities for Azure DevOps CLI
 */

import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Checks if an error is an authentication error from Azure CLI
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const errorObj = error as { stderr?: string; message?: string };
  const errorMessage = errorObj.stderr || errorObj.message || "";

  return (
    errorMessage.includes("Before you can run Azure DevOps commands") ||
    errorMessage.includes("az login") ||
    errorMessage.includes("az devops login") ||
    errorMessage.includes("setup credentials") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.toLowerCase().includes("401") ||
    errorMessage.toLowerCase().includes("403")
  );
}

/**
 * Shows an authentication error with helpful actions
 */
export async function handleAuthenticationError(error: unknown): Promise<void> {
  if (!isAuthenticationError(error)) {
    // Not an auth error, handle normally
    throw error;
  }

  const options = await confirmAlert({
    title: "Azure DevOps Authentication Required",
    message: `Open Terminal and run this command:

az login

Click "Copy Login Command" to copy it to your clipboard.`,
    primaryAction: {
      title: "Copy Login Command",
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });

  if (options) {
    // Copy the login command to clipboard
    try {
      const loginCommand = "az login";

      execFile("pbcopy", [], (error: Error | null) => {
        if (error) {
          console.error("Failed to copy to clipboard:", error);
        }
      }).stdin?.end(loginCommand);

      await showToast({
        style: Toast.Style.Success,
        title: "Login Command Copied",
        message: "Paste and run in Terminal: az login",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please run in Terminal:",
        message: "az login",
      });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Required",
      message: "Run 'az login' in Terminal to continue",
    });
  }
}

/**
 * Wraps an async function with authentication error handling
 */
export function withAuthErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isAuthenticationError(error)) {
        await handleAuthenticationError(error);
        // Re-throw to stop execution
        throw new Error("Authentication required. Please login and try again.");
      }
      throw error;
    }
  };
}

/**
 * Creates properties for a login action that copies the login command
 */
export function createLoginActionProps() {
  return {
    title: "Copy Login Command",
    icon: { source: "clipboard" as const },
    shortcut: {
      modifiers: ["cmd" as const, "shift" as const],
      key: "l" as const,
    },
    onAction: async () => {
      try {
        const loginCommand = "az login";

        execFile("pbcopy", [], (error: Error | null) => {
          if (error) {
            console.error("Failed to copy to clipboard:", error);
          }
        }).stdin?.end(loginCommand);

        await showToast({
          style: Toast.Style.Success,
          title: "Login Command Copied",
          message: "Paste and run in Terminal: az login",
        });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please run in Terminal:",
          message: "az login",
        });
      }
    },
  };
}

/**
 * Checks if user is currently authenticated
 */
export async function checkAuthentication(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("az", [
      "account",
      "show",
      "--output",
      "json",
    ]);
    return !!stdout && stdout.includes("user");
  } catch {
    return false;
  }
}

/**
 * Gets a friendly error message for display
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!isAuthenticationError(error)) {
    return "An error occurred. Please try again.";
  }

  return "Azure DevOps authentication required. Please login using 'az login' in Terminal.";
}
