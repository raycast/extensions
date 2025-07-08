import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { IPATOOL_PATH, preferences } from "./paths";
import { logger } from "./logger";

const execAsync = promisify(exec);

/**
 * Logs in to Apple ID using ipatool and user preferences.
 */
async function loginToAppleId(): Promise<void> {
  await execAsync(
    `${IPATOOL_PATH} auth login -e "${preferences.appleId}" -p "${preferences.password}" --format json --non-interactive`,
  );
  logger.log("Successfully authenticated with Apple ID");
}

/**
 * Ensures the user is authenticated with Apple ID
 */
export async function ensureAuthenticated(): Promise<boolean> {
  try {
    // Check if we're already authenticated
    // Add --format json to get JSON output
    const { stdout } = await execAsync(`${IPATOOL_PATH} auth info --format json --non-interactive`);

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
      showToast(Toast.Style.Failure, "Authentication failed", String(loginError));
      return false;
    }
  }
}
