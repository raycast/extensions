import { downloadApp, searchApps } from "../ipatool";
import path from "path";
import { logger } from "../utils/logger";
import { Tool, showToast, Toast } from "@raycast/api";
import { handleAppSearchError, handleDownloadError, handleAuthError, sanitizeQuery } from "../utils/error-handler";
import { analyzeIpatoolError } from "../utils/ipatool-error-patterns";

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
  logger.log(`[download-app tool] Starting download for app: "${sanitizeQuery(input.query)}"`);

  try {
    let bundleId = "";
    let appName = "";
    let appVersion = "";
    let price = "0";

    // Search for the app by name
    logger.log(`[download-app tool] Searching for app: "${sanitizeQuery(input.query)}"`);
    const searchResults = await searchApps(input.query, SEARCH_RESULT_LIMIT);

    if (searchResults.length === 0) {
      await handleAppSearchError(
        new Error(
          `No apps found matching "${sanitizeQuery(
            input.query,
          )}". Please try a different search term or check the exact app name.`,
        ),
        input.query,
        "download-app",
      );
      return { success: false, message: "No apps found" };
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
      logger.log(
        `[download-app tool] Note: Using closest match "${appName}" for search "${sanitizeQuery(input.query)}"`,
      );
    }

    // Download the app
    if (!bundleId) {
      await handleAppSearchError(
        new Error(`Could not determine bundle ID for "${sanitizeQuery(input.query)}"`),
        input.query,
        "download-app",
      );
      return { success: false, message: "Could not determine bundle ID" };
    }

    logger.log(`[download-app tool] Starting download for ${appName} (${bundleId})`);

    try {
      const filePath = await downloadApp(bundleId, appName, appVersion, price);

      if (filePath === null) {
        // Existing file found; skipped re-download. Validation flow already showed an informational toast.
        const msg = "App already exists and won't be  downloaded again.";
        logger.log(`[download-app tool] ${msg} (${appName} - ${bundleId})`);
        return { success: false, message: msg };
      }

      if (!filePath) {
        await handleDownloadError(
          new Error(
            `The app "${appName}" could not be downloaded. It may not be available in your region or may have been removed from the App Store.`,
          ),
          appName,
          "download-app",
        );
        return { success: false, message: "Download failed" };
      }

      // Verify file exists before reporting success (align with hook behavior)
      const fs = await import("fs");
      if (!fs.existsSync(filePath)) {
        await handleDownloadError(
          new Error(`File not found at expected path: ${filePath}`),
          "verify downloaded file",
          "download-app",
        );
        return { success: false, message: "Download failed" };
      }

      logger.log(`[download-app tool] Successfully downloaded app to: ${filePath}`);
      await showToast(Toast.Style.Success, "Download Complete", `${appName} saved to ${filePath}`);

      return {
        filePath,
        fileName: path.basename(filePath),
        appName,
        bundleId,
        version: appVersion,
      };
    } catch (downloadError) {
      logger.error(`[download-app tool] Download error for "${appName}":`, downloadError);

      // Analyze error to determine auth vs other failures and handle consistently
      const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError);
      const errorInfo = analyzeIpatoolError(errorMessage, undefined, "download");

      if (errorInfo.isAuthError) {
        // Show preferences action for auth in tool context
        await handleAuthError(new Error(errorInfo.userMessage), false, true);
        return { success: false, message: "Authentication failed" };
      }

      // Non-auth errors: show specific failure toast
      await handleDownloadError(new Error(errorInfo.userMessage), "download app", "download-app");

      if (errorInfo.errorType === "app_not_found") {
        return { success: false, message: "App not found" };
      }
      return { success: false, message: "Download failed" };
    }
  } catch (error) {
    logger.error(`[download-app tool] Error:`, error);
    await handleDownloadError(
      error instanceof Error ? error : new Error(`Failed to download app: ${String(error)}`),
      "download app",
      "download-app",
    );
    return { success: false, message: "Download failed" };
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
    const isExactMatch = appNameLower === queryLower; // Only consider exact matches

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
