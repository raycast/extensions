import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { IPATOOL_PATH, preferences } from "./paths";
// Import iTunes API functions from dedicated module

const execAsync = promisify(exec);

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
        await execAsync(
          `${IPATOOL_PATH} auth login -e "${preferences.appleId}" -p "${preferences.password}" --format json --non-interactive`,
        );
        console.log("Successfully authenticated with Apple ID");
      }
      return true;
    } catch (parseError) {
      // If we can't parse as JSON, check if it contains "Not authenticated"
      if (stdout.includes("Not authenticated")) {
        // If not authenticated, login
        await execAsync(
          `${IPATOOL_PATH} auth login -e "${preferences.appleId}" -p "${preferences.password}" --format json --non-interactive`,
        );
        console.log("Successfully authenticated with Apple ID");
        return true;
      }
      return false; // Force re-authentication if we can't determine status
    }
  } catch (error) {
    console.error("Authentication error:", error);
    // Try to login anyway
    try {
      await execAsync(
        `${IPATOOL_PATH} auth login -e "${preferences.appleId}" -p "${preferences.password}" --format json --non-interactive`,
      );
      console.log("Successfully authenticated with Apple ID");
      return true;
    } catch (loginError) {
      console.error("Login error:", loginError);
      showToast(Toast.Style.Failure, "Authentication failed", String(loginError));
      return false;
    }
  }
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return defaultValue;
  }
}

/**
 * Extracts a file path from a string using regex
 */
export function extractFilePath(text: string, defaultPath: string): string {
  // Try to find "saved to" pattern first
  const savedToMatch = text.match(/saved to (.*\.ipa)/i);
  if (savedToMatch && savedToMatch[1]) {
    return savedToMatch[1];
  }

  // Try to find "output:" pattern
  const outputMatch = text.match(/"output":"([^"]*\.ipa)"/);
  if (outputMatch && outputMatch[1]) {
    return outputMatch[1];
  }

  // Try to find any path ending with .ipa
  const ipaPathMatch = text.match(/([/\\][^/\\]*\.ipa)/);
  if (ipaPathMatch && ipaPathMatch[1]) {
    // This might be a partial path, so we need to find the full path
    const pathParts = text.split(ipaPathMatch[1]);
    if (pathParts.length > 0) {
      // Look for the part that contains a valid path
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (part.includes("/")) {
          const lastSlashIndex = part.lastIndexOf("/");
          const possiblePath = part.substring(lastSlashIndex) + ipaPathMatch[1];
          if (possiblePath.startsWith("/")) {
            return possiblePath;
          }
        }
      }
    }
  }

  // If all else fails, return the default path
  return defaultPath;
}

/**
 * Renders star rating as text (e.g., "★★★★☆" for 4.0)
 */
export function renderStarRating(rating: number | undefined): string {
  if (rating === undefined) return "No Rating";

  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);
}

/**
 * Formats a date string to a more readable format
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
