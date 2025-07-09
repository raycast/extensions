import { downloadIPA, searchApps } from "../ipatool";
import path from "path";
import { logger } from "../utils/logger";
import { showToast, Toast, Tool } from "@raycast/api";

// Constants
const SEARCH_RESULT_LIMIT = 1;

// No initial confirmation - we'll confirm only during the actual download process

type Input = {
  /**
   * The name or search term for the iOS app
   */
  query: string;
};

/**
 * Download an iOS app by name or bundle ID
 */
export default async function downloadIosApp(input: Input) {
  logger.log(`[download-app tool] Starting download for app: "${input.query}"`);

  try {
    let bundleId = "";
    let appName = "";
    let appVersion = "";
    let price = "0";

    // Search for the app by name
    logger.log(`[download-app tool] Searching for app: "${input.query}"`);
    const searchResults = await searchApps(input.query, SEARCH_RESULT_LIMIT);

    if (searchResults.length === 0) {
      logger.error(`[download-app tool] No apps found matching "${input.query}"`);
      await showToast(Toast.Style.Failure, "No Apps Found", `Could not find any apps matching "${input.query}"`);
      throw new Error(
        `No apps found matching "${input.query}". Please try a different search term or check the exact app name.`,
      );
    }

    // Use the first result as the best match
    // The confirmation will show the user what will be downloaded
    const app = searchResults[0];
    bundleId = app.bundleId || app.bundleID || "";
    appName = app.name || "";
    appVersion = app.version || "";
    price = app.price ? app.price.toString() : "0";
    logger.log(`[download-app tool] Found app: ${appName} (${bundleId}) version ${appVersion}`);

    // Log if we're using a different app than what was searched for
    const queryLower = input.query.toLowerCase();
    if (appName.toLowerCase() !== queryLower) {
      logger.log(`[download-app tool] Note: Using closest match "${appName}" for search "${input.query}"`);
    }

    // Download the app
    if (!bundleId) {
      logger.error(`[download-app tool] Could not determine bundle ID for "${input.query}"`);
      await showToast(Toast.Style.Failure, "Download Failed", `Could not determine bundle ID for "${input.query}"`);
      throw new Error(`Could not determine bundle ID for "${input.query}"`);
    }

    logger.log(`[download-app tool] Starting download for ${appName} (${bundleId})`);

    try {
      const filePath = await downloadIPA(bundleId, appName, appVersion, price);

      if (!filePath) {
        logger.error(`[download-app tool] Download returned null for "${appName}"`);
        await showToast(
          Toast.Style.Failure,
          "Download Failed",
          `The app "${appName}" could not be downloaded. It may not be available in your region or may have been removed from the App Store.`,
        );
        throw new Error(
          `The app "${appName}" could not be downloaded. It may not be available in your region or may have been removed from the App Store.`,
        );
      }

      logger.log(`[download-app tool] Successfully downloaded app to: ${filePath}`);

      return {
        filePath,
        fileName: path.basename(filePath),
        appName,
        bundleId,
        version: appVersion,
      };
    } catch (downloadError) {
      logger.error(`[download-app tool] Download error for "${appName}":`, downloadError);

      // Check if this is a specific error we can provide better messaging for
      const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError);

      if (errorMessage.includes("not found") || errorMessage.includes("no app")) {
        const friendlyMessage = `The app "${input.query}" was not found in the App Store. It may not be available in your region or may have been removed.`;
        await showToast(Toast.Style.Failure, "App Not Found", friendlyMessage);
        throw new Error(friendlyMessage);
      } else if (errorMessage.includes("authentication") || errorMessage.includes("login")) {
        const friendlyMessage = `Authentication failed. Please check your Apple ID credentials in the extension preferences.`;
        await showToast(Toast.Style.Failure, "Authentication Failed", friendlyMessage);
        throw new Error(friendlyMessage);
      } else {
        // Re-throw the original error for other cases
        throw downloadError;
      }
    }
  } catch (error) {
    logger.error(`[download-app tool] Error:`, error);
    // Re-throw the original error to preserve detailed error messages from downloadIPA
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to download app: ${String(error)}`);
  }
}

/**
 * Confirmation function to show the user what app will be downloaded
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  try {
    // Search for the app to show what will be downloaded
    const searchResults = await searchApps(input.query, 3);

    if (searchResults.length === 0) {
      // No confirmation needed if no apps found - the tool will handle the error
      return undefined;
    }

    const app = searchResults[0];
    const appName = app.name || "Unknown App";
    const developer = app.developer || "Unknown Developer";
    const version = app.version || "Unknown Version";
    const price = app.price ? `$${app.price}` : "Free";

    // Check if the match might not be exact
    const queryLower = input.query.toLowerCase();
    const appNameLower = appName.toLowerCase();
    const isExactMatch = appNameLower === queryLower;  // Only consider exact matches

    let message = `Download "${appName}"?`;
    if (!isExactMatch) {
      message = `You searched for "${input.query}" but the closest match is "${appName}". Download this app?`;
    }

    return {
      message,
      info: [
        { name: "App Name", value: appName },
        { name: "Developer", value: developer },
        { name: "Version", value: version },
        { name: "Price", value: price },
      ],
    };
  } catch (error) {
    // If we can't search, let the main tool handle it
    logger.error(`[download-app confirmation] Error during confirmation:`, error);
    return undefined;
  }
};
