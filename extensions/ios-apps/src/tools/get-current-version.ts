import { searchITunesApps } from "../utils/itunes-api";
import { logger } from "../utils/logger";
import { Tool } from "@raycast/api";
import type { ITunesResult } from "../types";
import { filterAndSortApps, isExactMatch, isSignificantlyMorePopular } from "../utils/app-search";
import { handleAppSearchError, handleToolError, sanitizeQuery } from "../utils/error-handler";

// Constants
const SEARCH_RESULT_LIMIT = 10;

type Input = {
  /**
   * The name or search term for the iOS app
   */
  query: string;

  /**
   * Optional bundle ID if known (will skip search step)
   */
  bundleId?: string;
};

/**
 * Confirmation function to handle disambiguation when multiple apps match
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  logger.log(
    `[get-current-version confirmation] Checking if disambiguation needed for: "${sanitizeQuery(input.query)}"`,
  );

  // Skip confirmation if bundle ID is provided
  if (input.bundleId) {
    return undefined;
  }

  try {
    // Search iTunes API directly - this gives us all the data we need in one call
    const searchResults = await searchITunesApps(input.query, SEARCH_RESULT_LIMIT);

    if (searchResults.length === 0) {
      return undefined; // No results, let the main function handle the error
    }

    // Filter and sort for relevant matches using shared utility function
    const sortedApps = filterAndSortApps(searchResults, input.query);

    logger.log(
      `[get-current-version confirmation] Found ${sortedApps.length} relevant apps out of ${searchResults.length} total`,
    );

    if (sortedApps.length <= 1) {
      // No disambiguation needed if only one relevant result
      return undefined;
    }

    // Log all results sorted by popularity
    logger.log(`[get-current-version confirmation] Apps ranked by popularity for "${sanitizeQuery(input.query)}":`);
    sortedApps.forEach((app: ITunesResult, index: number) => {
      logger.log(
        `[get-current-version confirmation] ${index + 1}. ${app.trackName} by ${app.artistName} - ${app.userRatingCount.toLocaleString()} ratings (${app.averageUserRating.toFixed(1)}★)`,
      );
    });

    // Check if the top app is significantly more popular (10x more ratings or exact name match)
    const topApp = sortedApps[0];
    const secondApp = sortedApps[1]; // Could be undefined if only 1 app
    const exactMatch = isExactMatch(topApp.trackName, input.query);
    const significantlyMorePopular = secondApp ? isSignificantlyMorePopular(topApp, secondApp) : true;

    if (exactMatch || significantlyMorePopular) {
      logger.log(
        `[get-current-version confirmation] Clear winner found: ${topApp.trackName} (exact: ${exactMatch}, popular: ${significantlyMorePopular})`,
      );
      return undefined; // No disambiguation needed
    }

    // Show disambiguation with popularity-ranked options
    logger.log(`[get-current-version confirmation] Multiple popular apps found, showing confirmation`);

    const topMatches = sortedApps.slice(0, 6); // Show top 6 by popularity
    const bestMatch = topMatches[0];

    return {
      message: `Found multiple apps matching "${input.query}". Proceed with "${bestMatch.trackName}" (most popular)?`,
      info: topMatches.map((app: ITunesResult, index: number) => ({
        name: `Option ${index + 1}`,
        value: `${app.trackName} by ${app.artistName} (${app.userRatingCount.toLocaleString()} ratings, ${input.query.toLowerCase().includes(app.trackName.toLowerCase()) ? "match" : "related"})`,
      })),
    };
  } catch (error) {
    logger.error(
      `[get-current-version confirmation] Error during disambiguation check: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      logger.error(`[get-current-version confirmation] Error stack: ${error.stack}`);
    }
    logger.error(`[get-current-version confirmation] Error details:`, error);
    return undefined; // Let the main function handle errors
  }
};

/**
 * Get the current version number of an iOS app by name or bundle ID
 */
export default async function getCurrentVersion(input: Input) {
  logger.log(`[get-current-version tool] Starting version lookup for: "${sanitizeQuery(input.query)}"`);

  try {
    let appData: ITunesResult;

    // If bundle ID provided, fetch directly; otherwise search first
    if (input.bundleId) {
      logger.log(`[get-current-version tool] Bundle ID provided: ${input.bundleId}`);

      // Search by bundle ID to get the specific app
      const searchResults = await searchITunesApps(input.bundleId, 1);

      if (searchResults.length === 0) {
        logger.log(`[get-current-version tool] No app found for bundle ID: ${input.bundleId}`);
        await handleAppSearchError(
          new Error(`No app found with bundle ID: ${input.bundleId}`),
          input.bundleId,
          "get-current-version",
        );
        return { version: "Unknown", appName: "Unknown", bundleId: "" };
      }

      appData = searchResults[0];
    } else {
      logger.log(
        `[get-current-version tool] No bundle ID provided, searching for app: "${sanitizeQuery(input.query)}"`,
      );

      // Search iTunes API directly
      const searchResults = await searchITunesApps(input.query, SEARCH_RESULT_LIMIT);

      if (searchResults.length === 0) {
        logger.log(`[get-current-version tool] No apps found for query: "${sanitizeQuery(input.query)}"`);
        await handleAppSearchError(
          new Error(`No apps found matching "${input.query}"`),
          input.query,
          "get-current-version",
        );
        return { version: "Unknown", appName: "Unknown", bundleId: "" };
      }

      // Filter and sort by popularity using shared utility function
      const sortedApps = filterAndSortApps(searchResults, input.query);

      if (sortedApps.length === 0) {
        logger.log(`[get-current-version tool] No relevant apps found for query: "${sanitizeQuery(input.query)}"`);
        await handleAppSearchError(
          new Error(`No relevant apps found matching "${input.query}"`),
          input.query,
          "get-current-version",
        );
        return { version: "Unknown", appName: "Unknown", bundleId: "" };
      }

      // Use the most popular/relevant app
      appData = sortedApps[0];
      logger.log(
        `[get-current-version tool] Selected most popular match: ${appData.trackName} (${appData.userRatingCount.toLocaleString()} ratings)`,
      );
    }

    logger.log(`[get-current-version tool] Successfully retrieved version ${appData.version} for ${appData.trackName}`);

    return {
      version: appData.version,
      appName: appData.trackName,
      bundleId: appData.bundleId,
    };
  } catch (error) {
    await handleToolError(
      error,
      "get-current-version tool",
      "Failed to get app version",
      false, // Don't throw, return error state instead
    );
    return { version: "Error", appName: "Error", bundleId: "" };
  }
}
