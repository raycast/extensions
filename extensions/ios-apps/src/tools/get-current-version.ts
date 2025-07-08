import { searchITunesApps } from "../utils/itunes-api";
import { logger } from "../utils/logger";
import { showToast, Toast, Tool } from "@raycast/api";
import type { ITunesResult } from "../types";

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
  logger.log(`[get-current-version confirmation] Checking if disambiguation needed for: "${input.query}"`);

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

    // Filter for relevant matches using basic name matching
    const query = input.query.toLowerCase();
    const relevantApps = searchResults.filter((app: ITunesResult) => {
      const name = (app.trackName || "").toLowerCase();
      const developer = (app.artistName || "").toLowerCase();

      // Include apps that match the query in name or developer
      return name.includes(query) || developer.includes(query) || name.startsWith(query) || query.includes(name);
    });

    logger.log(
      `[get-current-version confirmation] Found ${relevantApps.length} relevant apps out of ${searchResults.length} total`,
    );

    if (relevantApps.length <= 1) {
      // No disambiguation needed if only one relevant result
      return undefined;
    }

    // Sort by rating count (popularity) - iTunes API already has this data!
    const sortedApps = relevantApps.sort((a: ITunesResult, b: ITunesResult) => {
      // Primary sort: rating count (higher = more popular)
      if (b.userRatingCount !== a.userRatingCount) {
        return b.userRatingCount - a.userRatingCount;
      }
      // Secondary sort: average rating
      if (b.averageUserRating !== a.averageUserRating) {
        return b.averageUserRating - a.averageUserRating;
      }
      // Tertiary sort: name length (shorter = more likely to be main app)
      return a.trackName.length - b.trackName.length;
    });

    // Log all results sorted by popularity
    logger.log(`[get-current-version confirmation] Apps ranked by popularity for "${input.query}":`);
    sortedApps.forEach((app: ITunesResult, index: number) => {
      logger.log(
        `[get-current-version confirmation] ${index + 1}. ${app.trackName} by ${app.artistName} - ${app.userRatingCount.toLocaleString()} ratings (${app.averageUserRating.toFixed(1)}★)`,
      );
    });

    // Check if the top app is significantly more popular (10x more ratings or exact name match)
    const topApp = sortedApps[0];
    const secondApp = sortedApps[1];
    const topAppName = topApp.trackName.toLowerCase();
    const isExactMatch = topAppName === query;
    const isSignificantlyMorePopular = topApp.userRatingCount > secondApp.userRatingCount * 10;

    if (isExactMatch || isSignificantlyMorePopular) {
      logger.log(
        `[get-current-version confirmation] Clear winner found: ${topApp.trackName} (exact: ${isExactMatch}, popular: ${isSignificantlyMorePopular})`,
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
        value: `${app.trackName} by ${app.artistName} (${app.userRatingCount.toLocaleString()} ratings)`,
      })),
    };
  } catch (error) {
    logger.error(`[get-current-version confirmation] Error during disambiguation check: ${error}`);
    return undefined; // Let the main function handle errors
  }
};

/**
 * Get the current version number of an iOS app by name or bundle ID
 */
export default async function getCurrentVersion(input: Input) {
  logger.log(`[get-current-version tool] Starting version lookup for: "${input.query}"`);

  try {
    let appData: ITunesResult;

    // If bundle ID provided, fetch directly; otherwise search first
    if (input.bundleId) {
      logger.log(`[get-current-version tool] Bundle ID provided: ${input.bundleId}`);

      // Search by bundle ID to get the specific app
      const searchResults = await searchITunesApps(input.bundleId, 1);

      if (searchResults.length === 0) {
        logger.log(`[get-current-version tool] No app found for bundle ID: ${input.bundleId}`);
        await showToast(Toast.Style.Failure, "App not found", `No app found with bundle ID: ${input.bundleId}`);
        throw new Error(`No app found with bundle ID: ${input.bundleId}`);
      }

      appData = searchResults[0];
    } else {
      logger.log(`[get-current-version tool] No bundle ID provided, searching for app: "${input.query}"`);

      // Search iTunes API directly
      const searchResults = await searchITunesApps(input.query, SEARCH_RESULT_LIMIT);

      if (searchResults.length === 0) {
        logger.log(`[get-current-version tool] No apps found for query: "${input.query}"`);
        await showToast(Toast.Style.Failure, "No apps found", `No apps found matching "${input.query}"`);
        throw new Error(`No apps found matching "${input.query}"`);
      }

      // Filter and sort by popularity (same logic as confirmation)
      const query = input.query.toLowerCase();
      const relevantApps = searchResults.filter((app: ITunesResult) => {
        const name = (app.trackName || "").toLowerCase();
        const developer = (app.artistName || "").toLowerCase();

        return name.includes(query) || developer.includes(query) || name.startsWith(query) || query.includes(name);
      });

      if (relevantApps.length === 0) {
        logger.log(`[get-current-version tool] No relevant apps found for query: "${input.query}"`);
        await showToast(
          Toast.Style.Failure,
          "No relevant apps found",
          `No relevant apps found matching "${input.query}"`,
        );
        throw new Error(`No relevant apps found matching "${input.query}"`);
      }

      // Sort by popularity (rating count)
      const sortedApps = relevantApps.sort((a: ITunesResult, b: ITunesResult) => {
        // Primary sort: rating count (higher = more popular)
        if (b.userRatingCount !== a.userRatingCount) {
          return b.userRatingCount - a.userRatingCount;
        }
        // Secondary sort: average rating
        if (b.averageUserRating !== a.averageUserRating) {
          return b.averageUserRating - a.averageUserRating;
        }
        // Tertiary sort: name length (shorter = more likely to be main app)
        return a.trackName.length - b.trackName.length;
      });

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
    logger.error(`[get-current-version tool] Error getting app version: ${error}`);

    // Show user-friendly error message
    if (error instanceof Error) {
      await showToast(Toast.Style.Failure, "Error", error.message);
    } else {
      await showToast(Toast.Style.Failure, "Error", "Failed to get app version");
    }

    throw error;
  }
}
