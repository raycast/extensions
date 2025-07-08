import { getAppDetails, searchApps } from "../ipatool";
import { formatPrice } from "../utils/paths";
import { formatDate } from "../utils/common";
import { logger } from "../utils/logger";
import { showToast, Toast } from "@raycast/api";

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
 * Get detailed information about an iOS app by name or bundle ID
 */
export default async function getIosAppDetails(input: Input) {
  logger.log(`[get-app-details tool] Getting details for app: "${input.query}"`);

  try {
    // Will store the app details
    let bundleId = input.bundleId;

    // If no bundle ID is provided, search for the app first
    if (!bundleId) {
      logger.log(`[get-app-details tool] No bundle ID provided, searching for app: "${input.query}"`);
      const searchResults = await searchApps(input.query, SEARCH_RESULT_LIMIT);

      if (searchResults.length === 0) {
        logger.error(`[get-app-details tool] No apps found matching "${input.query}"`);
        await showToast(Toast.Style.Failure, "No Apps Found", `Could not find any apps matching "${input.query}"`);
        throw new Error(`No apps found matching "${input.query}"`);
      }

      // Log all search results for debugging
      logger.log(`[get-app-details tool] Found ${searchResults.length} results for "${input.query}"`);
      searchResults.forEach((app, index) => {
        logger.log(
          `[get-app-details tool] Result ${index + 1}: ${app.name} (${app.bundleId || app.bundleID || "unknown bundle ID"}) by ${app.developer || "unknown developer"}`,
        );
      });

      // Calculate relevance scores for each result to find the best match
      const query = input.query.toLowerCase();
      const scoredResults = searchResults.map((app) => {
        const name = (app.name || "").toLowerCase();
        const developer = (app.developer || "").toLowerCase();
        let score = 0;

        // Exact name match gets highest score
        if (name === query) {
          score += 100;
        }
        // Name starts with query
        else if (name.startsWith(query)) {
          score += 75;
        }
        // Query is contained in name
        else if (name.includes(query)) {
          score += 50;
        }

        // Developer name matches or contains query
        if (developer === query) {
          score += 30;
        } else if (developer.includes(query)) {
          score += 20;
        }

        // Prefer shorter names when scores are similar (likely more precise matches)
        score -= name.length * 0.1;

        return { app, score };
      });

      // Sort by score (highest first)
      scoredResults.sort((a, b) => b.score - a.score);

      // Log the scoring results for transparency
      logger.log(`[get-app-details tool] Relevance scoring results:`);
      scoredResults.forEach((result) => {
        logger.log(`[get-app-details tool] Score ${result.score.toFixed(1)}: ${result.app.name}`);
      });

      // Use the highest scoring result
      const bestMatch = scoredResults[0].app;
      bundleId = bestMatch.bundleId || bestMatch.bundleID;
      logger.log(`[get-app-details tool] Selected best match: ${bestMatch.name} with bundle ID: ${bundleId}`);
    }

    // Get app details using ipatool
    if (!bundleId) {
      logger.error(
        `[get-app-details tool] Could not determine bundle ID for "${input.query}". Search returned incomplete results.`,
      );
      await showToast(Toast.Style.Failure, "App Details Error", `Could not determine bundle ID for "${input.query}"`);
      return { app: null };
    }
    const appDetails = await getAppDetails(bundleId);

    if (!appDetails) {
      logger.error(`[get-app-details tool] Could not find app details for ${bundleId}`);
      await showToast(Toast.Style.Failure, "App Details Error", `Could not find app details for ${bundleId}`);
      throw new Error(`Could not find app details for ${bundleId}`);
    }

    logger.log(`[get-app-details tool] Successfully retrieved details for ${appDetails.name || "unknown app"}`);

    // Format the app details for better readability
    const formattedDetails = {
      id: appDetails.id,
      bundleId: appDetails.bundleId || "",
      name: appDetails.name,
      version: appDetails.version,
      developer: appDetails.sellerName,
      price: formatPrice(appDetails.price),
      description: appDetails.description,
      icon: appDetails.artworkUrl512 || appDetails.artworkUrl60 || appDetails.iconUrl,
      rating: appDetails.averageUserRating,
      ratingCount: appDetails.userRatingCount,
      size: appDetails.size,
      contentRating: appDetails.contentRating,
      releaseDate: appDetails.releaseDate ? formatDate(appDetails.releaseDate) : undefined,
      lastUpdated: appDetails.currentVersionReleaseDate ? formatDate(appDetails.currentVersionReleaseDate) : undefined,
      genres: appDetails.genres,
      appStoreUrl: appDetails.trackViewUrl || `https://apps.apple.com/app/id${appDetails.id}`,
      developerUrl: appDetails.artistViewUrl,
      screenshots: appDetails.screenshotUrls,
    };

    return { app: formattedDetails };
  } catch (error) {
    logger.error(`[get-app-details tool] Error: ${error}`);
    await showToast(Toast.Style.Failure, "App Details Error", `Failed to get app details: ${error}`);
    throw new Error(`Failed to get app details: ${error}`);
  }
}
