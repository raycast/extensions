import { LocalStorage, getPassword, setPassword, deletePassword } from "@raycast/api";
import { logger } from "./logger";
import { validateIpatoolInstallation, executeIpatoolCommand } from "./ipatool-validator";
import { handleAuthError } from "./error-handler";
import { analyzeIpatoolError } from "./ipatool-error-patterns";
import { handleProcessErrorCleanup } from "./temp-file-manager";

/**
 * Custom error types for authentication flow
 */
export class NeedsLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsLoginError";
  }
}

export class Needs2FAError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Needs2FAError";
  }
}

/**
 * Securely retrieve Apple ID from local storage
 */
async function getAppleIdFromStorage(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>("appleId");
}

/**
 * Securely retrieve password from secure storage
 */
async function getPasswordFromStorage(): Promise<string | undefined> {
  return await getPassword({ service: "ios-apps-apple-password" });
}

/**
 * Store Apple ID in local storage
 */
export async function storeAppleId(appleId: string): Promise<void> {
  await LocalStorage.setItem("appleId", appleId);
}

/**
 * Store password in secure storage
 */
export async function storePassword(password: string): Promise<void> {
  await setPassword({ service: "ios-apps-apple-password", password });
}

/**
 * Clear stored credentials from storage
 */
export async function clearStoredCredentials(): Promise<void> {
  await LocalStorage.removeItem("appleId");
  await deletePassword({ service: "ios-apps-apple-password" });
}

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
  // Get credentials from parameters or secure storage
  const email = appleId || (await getAppleIdFromStorage());
  const pass = password || (await getPasswordFromStorage());

  if (!email || !pass) {
    throw new NeedsLoginError("Apple ID and password are required for authentication");
  }

  const args = ["auth", "login", "-e", email, "-p", pass, "--format", "json", "--non-interactive"];

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

    // Check if it's a 2FA error
    if (
      errorAnalysis.userMessage.includes("Two-factor") ||
      errorAnalysis.userMessage.includes("2FA") ||
      errorMessage.includes("two-factor") ||
      errorMessage.includes("2FA")
    ) {
      throw new Needs2FAError("Two-factor authentication code required");
    }

    // Throw specific error based on analysis
    throw new Error(errorAnalysis.userMessage);
  }
}

/**
 * Ensures the user is authenticated with Apple ID
 * @param options Optional authentication credentials
 */
export async function ensureAuthenticated(options?: {
  email?: string;
  password?: string;
  code?: string;
}): Promise<boolean> {
  // First validate that ipatool is installed and accessible
  const isIpatoolValid = await validateIpatoolInstallation();
  if (!isIpatoolValid) {
    return false;
  }

  try {
    // Check if we're already authenticated (skip if we have a 2FA code to submit)
    if (!options?.code) {
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

    // Check if we need to throw specific errors for missing credentials
    const storedEmail = await getAppleIdFromStorage();
    const storedPassword = await getPasswordFromStorage();

    // If no credentials provided and no stored credentials, throw NeedsLoginError
    if (!options?.email && !storedEmail) {
      throw new NeedsLoginError("Please provide Apple ID credentials");
    }

    if (!options?.password && !storedPassword) {
      throw new NeedsLoginError("Please provide Apple ID password");
    }

    // Attempt to login with provided or stored credentials
    await loginToAppleId(options?.email, options?.password, options?.code);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Authentication check failed", { error: errorMessage });

    // Re-throw NeedsLoginError and Needs2FAError as-is
    if (error instanceof NeedsLoginError || error instanceof Needs2FAError) {
      throw error;
    }

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
