import { preferences } from "./paths";
import { logger } from "./logger";
import { validateIpatoolInstallation, executeIpatoolCommand } from "./ipatool-validator";
import { handleAuthError } from "./error-handler";
import { analyzeIpatoolError } from "./ipatool-error-patterns";
import { handleProcessErrorCleanup } from "./temp-file-manager";

/**
 * Secure wrapper for executing ipatool commands with error handling
 */
async function executeSecureIpatoolCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const result = await executeIpatoolCommand(args, {
    timeout: 30000, // 30 second timeout for auth commands
    allowedCommands: ["auth"],
  });

  if (!result.success) {
    const error = result.error || new Error("Unknown execution error");
    handleProcessErrorCleanup(error, "executeSecureIpatoolCommand");
    throw error;
  }

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

/**
 * Logs in to Apple ID using ipatool and user preferences.
 * @param twoFactorCode Optional 2FA code for two-factor authentication
 */
export async function loginToAppleId(appleId?: string, password?: string, twoFactorCode?: string): Promise<void> {
  const args = [
    "auth",
    "login",
    "-e",
    appleId || preferences.appleId,
    "-p",
    password || preferences.password,
    "--format",
    "json",
    "--non-interactive",
  ];

  // Add 2FA code if provided
  if (twoFactorCode) {
    args.push("--2fa", twoFactorCode);
  }

  try {
    await executeSecureIpatoolCommand(args);
    logger.log("Successfully authenticated with Apple ID");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Login failed", { error: errorMessage });

    // Use precise ipatool error analysis with auth context
    const errorAnalysis = analyzeIpatoolError(errorMessage, undefined, "auth");

    // Throw specific error based on analysis
    throw new Error(errorAnalysis.userMessage);
  }
}

/**
 * Ensures the user is authenticated with Apple ID
 * @param twoFactorCode Optional 2FA code for two-factor authentication
 */
export async function ensureAuthenticated(twoFactorCode?: string): Promise<boolean> {
  // First validate that ipatool is installed and accessible
  const isIpatoolValid = await validateIpatoolInstallation();
  if (!isIpatoolValid) {
    return false;
  }

  try {
    // Check if we're already authenticated (skip if we have a 2FA code to submit)
    if (!twoFactorCode) {
      const { stdout } = await executeSecureIpatoolCommand(["auth", "info", "--format", "json", "--non-interactive"]);

      try {
        // Try to parse as JSON
        const status = JSON.parse(stdout);

        if (status.authenticated) {
          return true; // Already authenticated
        }
      } catch (parseError) {
        // If we can't parse as JSON, check if it contains "Not authenticated"
        if (!stdout.includes("Not authenticated")) {
          return true; // Assume authenticated if we can't determine status clearly
        }
      }
    }

    // Attempt to login (with or without 2FA code)
    await loginToAppleId(twoFactorCode);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Authentication check failed", { error: errorMessage });

    // Use precise ipatool error analysis with auth context
    const errorAnalysis = analyzeIpatoolError(errorMessage, undefined, "auth");

    // Only handle authentication errors with preferences redirect
    if (errorAnalysis.isAuthError) {
      await handleAuthError(new Error(errorAnalysis.userMessage), false);
      throw new Error(errorAnalysis.userMessage); // Re-throw with user-friendly message
    }

    // For non-auth errors, just throw without special handling
    throw error;
  }
}
