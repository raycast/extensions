import { searchApps } from "../ipatool";
import { enrichAppDetails } from "../utils/itunes-api";
import { AppDetails } from "../types";
import { logger } from "../utils/logger";
import { showToast, Toast } from "@raycast/api";
import { handleAppSearchError, sanitizeQuery } from "../utils/error-handler";
import { truncateAtWordBoundary } from "../utils/common";

// No initial confirmation - search will execute immediately

type Input = {
  /**
   * The search query for finding iOS apps
   */
  query: string;
  /**
   * Maximum number of results to return (default: 10, max: 20)
   */
  limit?: number;
};

/**
 * Search for iOS apps by name or keyword
 */
export default async function searchIosApps(input: Input) {
  logger.log(
    `[search-apps tool] Searching for apps with query: "${sanitizeQuery(input.query)}", limit: ${input.limit || 10}`,
  );

  // Ensure limit is within bounds
  const validLimit = Math.min(Math.max(1, Number(input.limit) || 10), 20);

  try {
    // Search for apps using ipatool
    const apps = await searchApps(input.query, validLimit);
    logger.log(`[search-apps tool] Found ${apps.length} apps`);

    // Show progress toast for enrichment
    const enrichmentToast = await showToast({
      style: Toast.Style.Animated,
      title: "Enriching app details",
      message: `Processing ${apps.length} apps from iTunes API...`,
    });

    let completedApps = 0;
    let failedEnrichments = 0;

    // Map the results to a more user-friendly format with progress tracking
    const appPromises = apps.map(async (app) => {
      // Convert from ipatool format to AppDetails format
      const appDetails: AppDetails = {
        id: String(app.id),
        bundleId: app.bundleId || app.bundleID || "",
        name: app.name,
        version: app.version,
        price: app.price.toString(),
        currency: "USD", // Default currency for ipatool results
        // Default values for required fields from AppDetails interface
        artistName: "",
        artworkUrl60: "",
        description: "",
        iconUrl: "",
        sellerName: "",
        genres: [],
        size: "0",
        contentRating: "",
        // Additional required fields from AppDetails
        artworkUrl512: "",
        averageUserRating: 0,
        averageUserRatingForCurrentVersion: 0,
        userRatingCount: 0,
        userRatingCountForCurrentVersion: 0,
        releaseDate: "",
      };

      try {
        // Try to enrich with additional details from iTunes API
        const enriched = await enrichAppDetails(appDetails);

        completedApps++;
        const progressPercent = Math.round((completedApps / apps.length) * 100);
        enrichmentToast.message = `${completedApps}/${apps.length} (${progressPercent}%) - Latest: ${app.name}`;

        return {
          id: enriched.id,
          bundleId: enriched.bundleId,
          name: enriched.name,
          version: enriched.version,
          price: enriched.price,
          developer: enriched.sellerName,
          icon: enriched.artworkUrl512 || enriched.artworkUrl60 || enriched.iconUrl,
          rating: enriched.averageUserRating,
          description: enriched.description ? truncateAtWordBoundary(enriched.description, 200) : "",
        };
      } catch (error) {
        completedApps++;
        failedEnrichments++;

        const progressPercent = Math.round((completedApps / apps.length) * 100);
        enrichmentToast.message = `${completedApps}/${apps.length} (${progressPercent}%) - ${failedEnrichments} failed`;

        logger.error(`[search-apps tool] Error enriching app details for ${app.name || "unknown app"}:`, error);
        // Return basic info if enrichment fails
        return {
          id: appDetails.id,
          bundleId: appDetails.bundleId,
          name: appDetails.name,
          version: appDetails.version,
          price: appDetails.price,
        };
      }
    });

    // Wait for all promises to settle, even if some fail
    const results = await Promise.allSettled(appPromises);
    const formattedApps = results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter((app): app is NonNullable<typeof app> => app !== null);

    // Update final enrichment status
    if (failedEnrichments === 0) {
      enrichmentToast.style = Toast.Style.Success;
      enrichmentToast.title = "Apps enriched";
      enrichmentToast.message = `Successfully enriched all ${apps.length} apps`;
    } else if (failedEnrichments < apps.length) {
      enrichmentToast.style = Toast.Style.Success;
      enrichmentToast.title = "Apps partially enriched";
      enrichmentToast.message = `Enriched ${apps.length - failedEnrichments}/${apps.length} apps`;
    } else {
      enrichmentToast.style = Toast.Style.Failure;
      enrichmentToast.title = "Enrichment failed";
      enrichmentToast.message = "Could not enrich any app details";
    }

    return { apps: formattedApps };
  } catch (error) {
    await handleAppSearchError(
      error instanceof Error ? error : new Error(`Failed to search for apps: ${error}`),
      input.query,
      "search-apps",
    );
    return { apps: [] };
  }
}
