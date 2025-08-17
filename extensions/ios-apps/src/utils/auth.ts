import * as Raycast from "@raycast/api";
const { LocalStorage } = Raycast;
import { logger } from "./logger";
import { validateIpatoolInstallation, executeIpatoolCommand } from "./ipatool-validator";
import { analyzeIpatoolError } from "./ipatool-error-patterns";
import { handleProcessErrorCleanup } from "./temp-file-manager";

// Narrow, optional typing for Raycast's Keychain API to avoid 'any'
type KeychainAPI = {
  getPassword?: (options: { service: string; account: string }) => Promise<string | undefined>;
  setPassword?: (options: { service: string; account: string; password: string }) => Promise<void>;
  deletePassword?: (options: { service: string; account: string }) => Promise<void>;
};

const Keychain: KeychainAPI = ((Raycast as unknown as { Keychain?: KeychainAPI }).Keychain ?? {}) as KeychainAPI;

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

// Service name for secure keychain storage
const PASSWORD_SERVICE = "ios-apps-apple-password";

/**
 * Securely retrieve Apple ID from local storage
 */
export async function getAppleIdFromStorage(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>("appleId");
}

/**
 * Securely retrieve password from storage
 */
export async function getPasswordFromStorage(): Promise<string | undefined> {
  try {
    const appleId = await LocalStorage.getItem<string>("appleId");
    if (!appleId) {
      return undefined;
    }
    const pwd =
      typeof Keychain.getPassword === "function"
        ? await Keychain.getPassword({ service: PASSWORD_SERVICE, account: appleId })
        : undefined;
    return pwd ?? undefined;
  } catch (e) {
    logger.error("Failed to read password from secure storage", { error: e instanceof Error ? e.message : String(e) });
    return undefined;
  }
}

/**
 * Store Apple ID in local storage
 */
export async function storeAppleId(appleId: string): Promise<void> {
  await LocalStorage.setItem("appleId", appleId);
}

/**
 * Store password in storage
 */
export async function storePassword(password: string): Promise<void> {
  const appleId = await LocalStorage.getItem<string>("appleId");
  if (!appleId) {
    throw new Error("Apple ID must be stored before saving password");
  }
  if (typeof Keychain.setPassword !== "function") {
    logger.warn("Keychain.setPassword is not available; skipping password storage");
    return;
  }
  await Keychain.setPassword({ service: PASSWORD_SERVICE, account: appleId, password });
}

/**
 * Convenience: return stored credentials if present
 */
export async function getStoredCredentials(): Promise<{ email?: string; password?: string }> {
  const email = await getAppleIdFromStorage();
  const password = await getPasswordFromStorage();
  return { email, password };
}

/**
 * Clear stored credentials from storage
 */
export async function clearStoredCredentials(): Promise<void> {
  // Capture appleId first for keychain deletion
  const appleId = await LocalStorage.getItem<string>("appleId");
  // Best-effort cleanup of secure storage for current account
  try {
    if (appleId && typeof Keychain.deletePassword === "function") {
      await Keychain.deletePassword({ service: PASSWORD_SERVICE, account: appleId });
    }
  } catch (e) {
    logger.error("Failed to delete password from secure storage", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
  // Remove identifiers
  await LocalStorage.removeItem("appleId");
}

/**
 * Secure wrapper for executing ipatool commands with error handling
 */
async function executeSecureIpatoolCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const result = await executeIpatoolCommand(args, {
    timeout: 30000, // 30 second timeout for auth commands
    allowedCommands: ["auth"],
  });

  // Special handling for auth info command - it returns exit code 1 when not authenticated
  const isAuthInfoCommand = args[0] === "auth" && args[1] === "info";

  if (!result.success && !isAuthInfoCommand) {
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
    args.push("--auth-code", twoFactorCode);
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
      const { stdout, stderr } = await executeSecureIpatoolCommand([
        "auth",
        "info",
        "--format",
        "json",
        "--non-interactive",
      ]);

      // Log the output for debugging
      logger.log("[auth info] stdout:", stdout);
      logger.log("[auth info] stderr:", stderr);

      try {
        // Try to parse as JSON
        const status = JSON.parse(stdout);

        // Check for success field and authenticated status
        if (status.success === false && status.error) {
          // Check if it's a keyring error (not authenticated)
          if (
            status.error.includes("failed to get account") ||
            status.error.includes("keyring") ||
            status.error.includes("The specified item could not be found")
          ) {
            logger.log("[auth info] User is not authenticated (keyring error)");
            // Continue to login flow
          } else {
            // Other error - throw it
            throw new Error(status.error);
          }
        } else if (status.authenticated === true || status.success === true) {
          return true; // Already authenticated
        }
      } catch (parseError) {
        // If we can't parse as JSON, check the output
        if (stdout.trim() === "" && stderr.includes("Not authenticated")) {
          // Not authenticated - this is expected
          logger.log("[auth info] User is not authenticated");
        } else if (!stdout.includes("Not authenticated") && !stderr.includes("Not authenticated")) {
          // If there's no clear "Not authenticated" message, assume authenticated
          return true;
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

    // CRITICAL: Verify authentication actually took after login to avoid keyring mismatch
    try {
      const { stdout: verifyOut, stderr: verifyErr } = await executeSecureIpatoolCommand([
        "auth",
        "info",
        "--format",
        "json",
        "--non-interactive",
      ]);
      logger.log("[auth info] post-login stdout:", verifyOut);
      logger.log("[auth info] post-login stderr:", verifyErr);
      if (verifyOut.trim()) {
        const status = JSON.parse(verifyOut);
        if (status.authenticated === true || status.success === true) {
          return true;
        }
        // If ipatool explicitly reports a keyring/account error, surface a login-needed error
        if (
          typeof status.error === "string" &&
          (status.error.includes("failed to get account") ||
            status.error.includes("keyring") ||
            status.error.includes("The specified item could not be found"))
        ) {
          throw new NeedsLoginError(
            "Keychain item not found for ipatool after login. Please re-authenticate and allow Keychain access.",
          );
        }
      }
      // As a fallback, treat empty/non-JSON successful responses as authenticated
      if (!verifyErr.toLowerCase().includes("not authenticated")) {
        return true;
      }
      // Explicit not authenticated in stderr
      throw new NeedsLoginError("Authentication did not persist. Please try logging in again.");
    } catch (e) {
      // If verification failed because we raised a login-needed error, rethrow it
      if (e instanceof NeedsLoginError) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("[auth info] post-login verification parse failed", msg);
      // Do NOT assume authenticated on parse errors; fall through to generic login-needed guidance
      throw new NeedsLoginError("Unable to verify authentication. Please try logging in again.");
    }

    // If we reached here, we are still not authenticated
    throw new NeedsLoginError("Authentication did not persist. Please try logging in again.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Authentication check failed", { error: errorMessage });

    // Re-throw NeedsLoginError and Needs2FAError as-is
    if (error instanceof NeedsLoginError || error instanceof Needs2FAError) {
      throw error;
    }

    // Use precise ipatool error analysis with auth context
    const errorAnalysis = analyzeIpatoolError(errorMessage, undefined, "auth");

    // Check if it's an authentication error that needs login
    if (errorAnalysis.isAuthError && !options?.email && !options?.password) {
      // Throw NeedsLoginError to trigger the login form
      throw new NeedsLoginError(errorAnalysis.userMessage);
    }

    // For other errors, throw with user-friendly message
    throw new Error(errorAnalysis.userMessage);
  }
}
