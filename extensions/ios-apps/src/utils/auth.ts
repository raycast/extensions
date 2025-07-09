import { showFailureToast } from "@raycast/utils";
import { spawn } from "child_process";
import { IPATOOL_PATH, preferences } from "./paths";
import { logger } from "./logger";
import { validateIpatoolInstallation } from "./ipatool-validator";

/**
 * Secure spawn-based execution to prevent command injection
 */
function spawnAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Logs in to Apple ID using ipatool and user preferences.
 */
async function loginToAppleId(): Promise<void> {
  await spawnAsync(IPATOOL_PATH, [
    "auth",
    "login",
    "-e",
    preferences.appleId,
    "-p",
    preferences.password,
    "--format",
    "json",
    "--non-interactive",
  ]);
  logger.log("Successfully authenticated with Apple ID");
}

/**
 * Ensures the user is authenticated with Apple ID
 */
export async function ensureAuthenticated(): Promise<boolean> {
  // First validate that ipatool is installed and accessible
  const isIpatoolValid = await validateIpatoolInstallation();
  if (!isIpatoolValid) {
    return false;
  }

  try {
    // Check if we're already authenticated
    // Add --format json to get JSON output
    const { stdout } = await spawnAsync(IPATOOL_PATH, ["auth", "info", "--format", "json", "--non-interactive"]);

    try {
      // Try to parse as JSON
      const status = JSON.parse(stdout);

      if (!status.authenticated) {
        // If not authenticated, login
        await loginToAppleId();
        return true;
      }
      return true;
    } catch (parseError) {
      // If we can't parse as JSON, check if it contains "Not authenticated"
      if (stdout.includes("Not authenticated")) {
        // If not authenticated, login
        await loginToAppleId();
        return true;
      }
      return false; // Force re-authentication if we can't determine status
    }
  } catch (error) {
    logger.error("Authentication error:", error);
    // Try to login anyway
    try {
      await loginToAppleId();
      return true;
    } catch (loginError) {
      logger.error("Login error:", loginError);
      showFailureToast(loginError, { title: "Authentication failed" });
      return false;
    }
  }
}
