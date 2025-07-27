import { Tool, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { scrapeAppStoreScreenshots } from "../utils/app-store-scraper";
import { downloadAppScreenshots } from "../utils/screenshot-downloader";
import { getDownloadsDirectory } from "../utils/paths";
import { filterAndSortApps, isExactMatch, isSignificantlyMorePopular } from "../utils/app-search";
import { searchITunesApps, convertITunesResultToAppDetails } from "../utils/itunes-api";
import { logger } from "../utils/logger";
import type { PlatformType, ITunesResult } from "../types";

type Input = {
  /** The name or search term for the iOS app */
  query: string;
  /** Optional bundle ID if known (will skip search step) */
  bundleId?: string;
  /** Optional platform override to download specific platforms regardless of preferences */
  platformOverride?: PlatformType[];
};

export default async function (input: Input) {
  const { query, bundleId, platformOverride } = input;

  logger.log(`[download-app-screenshots] Starting screenshot download for: "${query}"`);

  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching App Details",
      message: `Searching for ${query}...`,
    });

    let appData: ITunesResult;

    // If bundle ID provided, fetch directly; otherwise search first
    if (bundleId) {
      logger.log(`[download-app-screenshots] Bundle ID provided: ${bundleId}`);
      const searchResults = await searchITunesApps(bundleId, 1);

      if (searchResults.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "App Not Found";
        toast.message = `No app found with bundle ID: ${bundleId}`;
        return;
      }

      appData = searchResults[0];
    } else {
      logger.log(`[download-app-screenshots] Searching for app: "${query}"`);
      const searchResults = await searchITunesApps(query, 10);

      if (searchResults.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "App Not Found";
        toast.message = `No apps found matching "${query}"`;
        return;
      }

      // Filter and sort by popularity
      const sortedApps = filterAndSortApps(searchResults, query);

      if (sortedApps.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Relevant Apps";
        toast.message = `No relevant apps found matching "${query}"`;
        return;
      }

      // Use the most popular/relevant app
      appData = sortedApps[0];
      logger.log(
        `[download-app-screenshots] Selected most popular match: ${appData.trackName} (${appData.userRatingCount.toLocaleString()} ratings)`,
      );
    }

    // Convert iTunes result to AppDetails format
    const appDetails = convertITunesResultToAppDetails(appData);

    toast.message = `Found ${appDetails.name} by ${appDetails.artistName}`;

    const downloadsDir = await getDownloadsDirectory();
    if (!downloadsDir) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = "Could not determine downloads directory";
      return;
    }

    // Update toast for screenshot fetching
    toast.title = "Fetching Screenshots";
    toast.message = "Analyzing App Store page...";

    const screenshots = await scrapeAppStoreScreenshots(appDetails, platformOverride);
    if (screenshots.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No Screenshots Found";
      toast.message = platformOverride
        ? `No ${platformOverride.join(", ")} screenshots available for this app`
        : "No screenshots available for enabled platforms";
      return;
    }

    // Log platform breakdown
    const platformCounts: Record<string, number> = {};
    screenshots.forEach((s) => {
      platformCounts[s.type] = (platformCounts[s.type] || 0) + 1;
    });

    const platformSummary = Object.entries(platformCounts)
      .map(([platform, count]) => `${platform}: ${count}`)
      .join(", ");

    logger.log(`[download-app-screenshots] Found screenshots: ${platformSummary}`);

    // Update toast for downloading
    toast.title = "Downloading Screenshots";
    toast.message = `Found ${screenshots.length} screenshots (${platformSummary})`;

    const resultPath = await downloadAppScreenshots(screenshots, appDetails, downloadsDir);

    if (resultPath) {
      toast.style = Toast.Style.Success;
      toast.title = "Screenshots Downloaded";
      toast.message = `${screenshots.length} screenshots saved for ${appDetails.name}`;
    } else {
      await showFailureToast(new Error("Failed to download screenshots. Check logs for details."), {
        title: "Download Failed",
      });
    }
  } catch (error) {
    logger.error(`[download-app-screenshots] Error:`, error);
    await showFailureToast(error instanceof Error ? error : new Error(String(error)), { title: "Download Error" });
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  logger.log(`[download-app-screenshots confirmation] Checking if disambiguation needed for: "${input.query}"`);

  // Skip confirmation if bundle ID is provided
  if (input.bundleId) {
    return undefined;
  }

  try {
    // Search iTunes API directly
    const searchResults = await searchITunesApps(input.query, 10);

    if (searchResults.length === 0) {
      return undefined; // No results, let the main function handle the error
    }

    // Filter and sort for relevant matches
    const sortedApps = filterAndSortApps(searchResults, input.query);

    if (sortedApps.length <= 1) {
      // No disambiguation needed if only one relevant result
      return undefined;
    }

    // Check if the top app is significantly more popular or an exact match
    const topApp = sortedApps[0];
    const secondApp = sortedApps.length > 1 ? sortedApps[1] : null;
    const exactMatch = isExactMatch(topApp.trackName, input.query);
    const significantlyMorePopular = secondApp ? isSignificantlyMorePopular(topApp, secondApp) : true;

    if (exactMatch || significantlyMorePopular) {
      logger.log(
        `[download-app-screenshots confirmation] Clear winner found: ${topApp.trackName} (exact: ${exactMatch}, popular: ${significantlyMorePopular})`,
      );
      return undefined; // No disambiguation needed
    }

    // Show simple confirmation for the most popular app
    logger.log(`[download-app-screenshots confirmation] Multiple popular apps found, showing confirmation`);

    const topMatches = sortedApps.slice(0, 3); // Show top 3 in the message
    const alternativeApps = topMatches
      .slice(1)
      .map((app) => app.trackName)
      .join(", ");

    return {
      message: `Found multiple apps for "${input.query}". Download screenshots for "${topApp.trackName}" by ${topApp.artistName}?`,
      info: [
        {
          name: "Selected App",
          value: `${topApp.trackName} by ${topApp.artistName} (${topApp.userRatingCount.toLocaleString()} ratings)`,
        },
        {
          name: "Alternatives Found",
          value: alternativeApps || "None",
        },
        {
          name: "Platform Override",
          value: input.platformOverride ? input.platformOverride.join(", ") : "Using preferences",
        },
      ],
    };
  } catch (error) {
    logger.error(`[download-app-screenshots confirmation] Error during disambiguation check:`, error);
    return undefined; // Let the main function handle errors
  }
};
