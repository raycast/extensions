// Screenshot downloader utility functions
import fs from "fs";
import path from "path";
import { promisify } from "util";
import pLimit from "p-limit";
import { showFailureToast } from "@raycast/utils";
import { showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";
import { AppDetails, PlatformDirectories, PlatformType, ScreenshotInfo } from "../types";
import { getDownloadsDirectory } from "./paths";
import { logger } from "./logger";

// Promisify fs functions
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

// Configuration constants
const RATE_LIMIT_DELAY_MS = 100;
const DEFAULT_DOWNLOAD_TIMEOUT_SECONDS = 90;
const MIN_DOWNLOAD_TIMEOUT_SECONDS = 30;
const DEFAULT_MAX_CONCURRENT_DOWNLOADS = 5;
const MIN_CONCURRENT_DOWNLOADS = 1;
const MAX_CONCURRENT_DOWNLOADS = 10;
const MIN_BATCH_TIMEOUT_MS = 180000; // 3 minutes minimum for batch operations
const BATCH_TIMEOUT_MULTIPLIER = 2; // Multiply individual timeout by this factor for batch timeout

/**
 * Platform preferences interface (duplicated for this file to avoid circular dependencies)
 */
interface PlatformPreferences {
  includeIPhone: boolean;
  includeIPad: boolean;
  includeMac: boolean;
  includeAppleTV: boolean;
  includeAppleWatch: boolean;
  includeVisionPro: boolean;
  includeIMessage: boolean;
  downloadTimeoutSeconds: string;
  maxConcurrentDownloads: string;
}

/**
 * Log current platform preferences for debugging
 */
function logPlatformPreferences(): void {
  try {
    const preferences = getPreferenceValues<PlatformPreferences>();
    const enabledPlatforms: string[] = [];
    const disabledPlatforms: string[] = [];

    if (preferences.includeIPhone) enabledPlatforms.push("iPhone");
    else disabledPlatforms.push("iPhone");

    if (preferences.includeIPad) enabledPlatforms.push("iPad");
    else disabledPlatforms.push("iPad");

    if (preferences.includeMac) enabledPlatforms.push("Mac");
    else disabledPlatforms.push("Mac");

    if (preferences.includeAppleTV) enabledPlatforms.push("AppleTV");
    else disabledPlatforms.push("AppleTV");

    if (preferences.includeAppleWatch) enabledPlatforms.push("AppleWatch");
    else disabledPlatforms.push("AppleWatch");

    if (preferences.includeVisionPro) enabledPlatforms.push("VisionPro");
    else disabledPlatforms.push("VisionPro");

    if (preferences.includeIMessage) enabledPlatforms.push("iMessage");
    else disabledPlatforms.push("iMessage");

    logger.log(`[Screenshot Downloader] Platform preferences - Enabled: [${enabledPlatforms.join(", ")}]`);
    logger.log(`[Screenshot Downloader] Platform preferences - Disabled: [${disabledPlatforms.join(", ")}]`);

    if (enabledPlatforms.length === 0) {
      logger.warn(`[Screenshot Downloader] WARNING: No platforms are enabled in preferences!`);
    }
  } catch (error) {
    logger.error(`[Screenshot Downloader] Error reading platform preferences:`, error);
  }
}

/**
 * Get download timeout from preferences
 */
function getDownloadTimeoutMs(): number {
  try {
    const preferences = getPreferenceValues<PlatformPreferences>();
    const timeoutSeconds = parseInt(preferences.downloadTimeoutSeconds || String(DEFAULT_DOWNLOAD_TIMEOUT_SECONDS), 10);
    return Math.max(timeoutSeconds, MIN_DOWNLOAD_TIMEOUT_SECONDS) * 1000;
  } catch (error) {
    logger.error(`[Screenshot Downloader] Error reading download timeout preference:`, error);
    return DEFAULT_DOWNLOAD_TIMEOUT_SECONDS * 1000;
  }
}

/**
 * Get max concurrent downloads from preferences
 */
function getMaxConcurrentDownloads(): number {
  try {
    const preferences = getPreferenceValues<PlatformPreferences>();
    const maxConcurrent = parseInt(preferences.maxConcurrentDownloads || String(DEFAULT_MAX_CONCURRENT_DOWNLOADS), 10);
    return Math.max(Math.min(maxConcurrent, MAX_CONCURRENT_DOWNLOADS), MIN_CONCURRENT_DOWNLOADS);
  } catch (error) {
    logger.error(`[Screenshot Downloader] Error reading max concurrent downloads preference:`, error);
    return DEFAULT_MAX_CONCURRENT_DOWNLOADS;
  }
}

/**
 * Download a file from a URL with rate limiting and configurable timeout
 * @param url URL to download from
 * @param filePath Path to save the file to
 */
async function downloadFile(url: string, filePath: string): Promise<void> {
  const timeoutMs = getDownloadTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    logger.log(`[Screenshot Downloader] Starting download: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await writeFileAsync(filePath, Buffer.from(buffer));
    logger.log(`[Screenshot Downloader] Successfully downloaded: ${filePath}`);

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Download timeout after ${timeoutMs / 1000}s`);
    }
    logger.error(`[Screenshot Downloader] Error downloading ${url}:`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Track download progress by platform
 */
interface PlatformProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
}

/**
 * Download queue utility using p-limit for concurrency control with enhanced progress tracking
 * @param screenshots Array of screenshot info objects
 * @param platformDirs Platform directories mapping
 * @param onProgress Progress callback with platform-specific information
 * @returns Promise resolving to download results
 */
async function downloadQueue(
  screenshots: ScreenshotInfo[],
  platformDirs: Record<string, string>,
  onProgress: (
    completed: number,
    total: number,
    platform: string,
    platformProgress: Record<string, PlatformProgress>,
  ) => void,
): Promise<{
  successCount: number;
  failedDownloads: Array<{ url: string; error: string; platform: string }>;
  platformResults: Record<string, PlatformProgress>;
}> {
  const maxConcurrent = getMaxConcurrentDownloads();
  const limit = pLimit(maxConcurrent);
  const failedDownloads: Array<{ url: string; error: string; platform: string }> = [];
  let completedCount = 0;
  const totalScreenshots = screenshots.length;

  // Initialize platform progress tracking
  const platformProgress: Record<string, PlatformProgress> = {};
  screenshots.forEach((screenshot) => {
    if (!platformProgress[screenshot.type]) {
      platformProgress[screenshot.type] = {
        total: 0,
        completed: 0,
        successful: 0,
        failed: 0,
      };
    }
    platformProgress[screenshot.type].total++;
  });

  logger.log(`[Screenshot Downloader] Starting concurrent downloads with max ${maxConcurrent} concurrent`);
  logger.log(
    `[Screenshot Downloader] Platform breakdown:`,
    Object.entries(platformProgress)
      .map(([platform, progress]) => `${platform}: ${progress.total}`)
      .join(", "),
  );

  // Create download tasks
  const downloadTasks = screenshots.map((screenshot) => {
    return limit(async () => {
      const platformDir = platformDirs[screenshot.type];
      if (!platformDir) {
        const error = `No directory found for platform: ${screenshot.type}`;
        logger.warn(`[Screenshot Downloader] ${error}`);
        failedDownloads.push({ url: screenshot.url, error, platform: screenshot.type });

        // Update progress counters
        completedCount++;
        platformProgress[screenshot.type].completed++;
        platformProgress[screenshot.type].failed++;

        onProgress(completedCount, totalScreenshots, screenshot.type, platformProgress);
        return;
      }

      const screenshotNumber = screenshot.index + 1;
      const filename = `${screenshotNumber}.png`;
      const filePath = path.join(platformDir, filename);

      try {
        await downloadFile(screenshot.url, filePath);

        // Update progress counters
        completedCount++;
        platformProgress[screenshot.type].completed++;
        platformProgress[screenshot.type].successful++;

        onProgress(completedCount, totalScreenshots, screenshot.type, platformProgress);
        logger.log(
          `[Screenshot Downloader] ✓ Downloaded ${screenshot.type} #${screenshotNumber} (${completedCount}/${totalScreenshots})`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          `[Screenshot Downloader] ✗ Failed to download ${screenshot.type} #${screenshotNumber}: ${errorMessage}`,
        );
        failedDownloads.push({
          url: screenshot.url,
          error: errorMessage,
          platform: screenshot.type,
        });

        // Update progress counters
        completedCount++;
        platformProgress[screenshot.type].completed++;
        platformProgress[screenshot.type].failed++;

        onProgress(completedCount, totalScreenshots, screenshot.type, platformProgress);
      }
    });
  });

  // Wait for all downloads to complete with a reasonable timeout
  // Individual downloads have their own timeout, but we also need a batch timeout
  const batchTimeoutMs = Math.max(getDownloadTimeoutMs() * BATCH_TIMEOUT_MULTIPLIER, MIN_BATCH_TIMEOUT_MS);
  const batchTimeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(`Batch download timeout after ${batchTimeoutMs / 1000}s - some downloads may still be in progress`),
      );
    }, batchTimeoutMs);
  });

  try {
    await Promise.race([Promise.all(downloadTasks), batchTimeoutPromise]);
    logger.log(`[Screenshot Downloader] All downloads completed within timeout`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Batch download timeout")) {
      logger.warn(`[Screenshot Downloader] ${error.message}`);
      logger.warn(`[Screenshot Downloader] Completed ${completedCount}/${totalScreenshots} downloads before timeout`);
    } else {
      throw error;
    }
  }

  const successCount = totalScreenshots - failedDownloads.length;
  logger.log(
    `[Screenshot Downloader] All downloads completed: ${successCount} successful, ${failedDownloads.length} failed`,
  );

  // Log failed URLs per platform for easy retry
  const failedByPlatform: Record<string, string[]> = {};
  failedDownloads.forEach(({ url, platform }) => {
    if (!failedByPlatform[platform]) {
      failedByPlatform[platform] = [];
    }
    failedByPlatform[platform].push(url);
  });

  if (Object.keys(failedByPlatform).length > 0) {
    logger.warn(`[Screenshot Downloader] Failed URLs by platform:`);
    Object.entries(failedByPlatform).forEach(([platform, urls]) => {
      logger.warn(`[Screenshot Downloader] ${platform}: ${urls.length} failed`);
      urls.forEach((url, index) => {
        logger.warn(`[Screenshot Downloader]   ${index + 1}. ${url}`);
      });
    });
  }

  return { successCount, failedDownloads, platformResults: platformProgress };
}

/**
 * Generate a README file for the screenshots
 * @param screenshotsDir Directory where screenshots are saved
 * @param app App details
 * @param screenshotsByType Screenshots grouped by platform type
 */
async function generateReadme(
  screenshotsDir: string,
  app: AppDetails,
  screenshotsByType: Record<string, ScreenshotInfo[]>,
): Promise<void> {
  try {
    const readmePath = path.join(screenshotsDir, "README.md");
    const platforms = Object.keys(screenshotsByType).filter((platform) => screenshotsByType[platform].length > 0);

    const content = `# ${app.name} Screenshots

App Store screenshots for ${app.name} (${app.bundleId}) version ${app.version}

## Platforms

${platforms.map((platform) => `- **${platform}**: ${screenshotsByType[platform].length} screenshots`).join("\n")}

Downloaded on ${new Date().toLocaleString()}
`;

    await writeFileAsync(readmePath, content);
    logger.log(`[Screenshot Downloader] Generated README at ${readmePath}`);
  } catch (error) {
    logger.error("[Screenshot Downloader] Error generating README:", error);
  }
}

/**
 * Download screenshots for an app
 * @param screenshots Array of screenshot information objects
 * @param app App details
 * @param downloadsDir Directory to save screenshots to
 * @returns Path to the screenshots directory
 */
export async function downloadAppScreenshots(
  screenshots: ScreenshotInfo[],
  app: AppDetails,
  downloadsDir: string,
): Promise<string> {
  try {
    logger.log(
      `[Screenshot Downloader] Received ${screenshots ? screenshots.length : "undefined"} screenshots to download`,
    );
    if (!screenshots || screenshots.length === 0) {
      logger.log("[Screenshot Downloader] No screenshots to download");
      return "";
    }

    // Log the first few screenshots to help debug
    const sampleScreenshots = screenshots.slice(0, 2);
    logger.log(`[Screenshot Downloader] Sample screenshots: ${JSON.stringify(sampleScreenshots)}`);

    // Create a sanitized folder name
    const sanitizedAppName = app.name
      .split(":")[0]
      .trim()
      .replace(/[/?%*:|"<>]/g, "-");
    const folderName = `${sanitizedAppName} Screenshots`;
    const screenshotsDir = path.join(downloadsDir, folderName);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
      logger.log(`[Screenshot Downloader] Creating screenshots directory: ${screenshotsDir}`);
      await mkdirAsync(screenshotsDir, { recursive: true });
    }

    // Create platform-specific directories using the centralized mapping
    const platformDirs = PlatformDirectories(screenshotsDir);

    // Group screenshots by platform type
    const screenshotsByType: Record<string, ScreenshotInfo[]> = {};

    // Initialize groups for screenshots we actually have
    for (const screenshot of screenshots) {
      if (!screenshotsByType[screenshot.type]) {
        screenshotsByType[screenshot.type] = [];
        logger.log(`[Screenshot Downloader] Created group for platform: ${screenshot.type}`);
      }
      screenshotsByType[screenshot.type].push(screenshot);
    }

    // Iterate over ALL platforms (from PlatformType enum) to ensure complete coverage
    const allPlatformTypes: PlatformType[] = [
      "iPhone",
      "iPad",
      "Mac",
      "AppleTV",
      "AppleWatch",
      "VisionPro",
      "iMessage",
    ];

    // Initialize empty arrays for platforms with no screenshots
    for (const platformType of allPlatformTypes) {
      if (!screenshotsByType[platformType]) {
        screenshotsByType[platformType] = [];
        logger.log(`[Screenshot Downloader] No screenshots found for platform: ${platformType}`);
      }
    }

    // Log screenshot counts by platform (for ALL platforms)
    logger.log(`[Screenshot Downloader] Screenshots by platform:`);
    for (const platformType of allPlatformTypes) {
      const count = screenshotsByType[platformType]?.length || 0;
      logger.log(`[Screenshot Downloader] - ${platformType}: ${count} screenshots`);
    }

    // Create directories ONLY for platforms that have ≥1 screenshot
    for (const platformType of allPlatformTypes) {
      const platformScreenshots = screenshotsByType[platformType];
      if (platformScreenshots && platformScreenshots.length > 0) {
        const dir = platformDirs[platformType];
        if (dir && !fs.existsSync(dir)) {
          await mkdirAsync(dir, { recursive: true });
          logger.log(`[Screenshot Downloader] Created directory for ${platformType}: ${dir}`);
        }
      }
    }

    // Download all screenshots with parallel processing
    const maxConcurrent = getMaxConcurrentDownloads();
    const timeoutSeconds = Math.floor(getDownloadTimeoutMs() / 1000);
    await showHUD(
      `Downloading ${screenshots.length} high-resolution screenshots (max ${maxConcurrent} concurrent, ${timeoutSeconds}s timeout)...`,
    );

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading screenshots",
      message: "Starting parallel downloads...",
    });

    const totalScreenshots = screenshots.length;
    logger.log(
      `[Screenshot Downloader] Starting parallel download of ${totalScreenshots} screenshots with max ${maxConcurrent} concurrent`,
    );

    // Use the download queue for parallel processing
    const { successCount, failedDownloads, platformResults } = await downloadQueue(
      screenshots,
      platformDirs,
      (completed: number, total: number, platform: string, platformProgress: Record<string, PlatformProgress>) => {
        // Update progress in real-time with platform-specific information
        const progressPercent = Math.round((completed / total) * 100);

        // Build platform summary for toast
        const platformSummary = Object.entries(platformProgress)
          .filter(([, progress]) => progress.total > 0)
          .map(([platformName, progress]) => {
            // Progress percentage calculation removed as it was unused
            return `${platformName}: ${progress.successful}/${progress.total}`;
          })
          .join(", ");

        toast.message = `${completed}/${total} (${progressPercent}%) | ${platformSummary}`;
      },
    );

    // Generate a README file
    await generateReadme(screenshotsDir, app, screenshotsByType);

    // Calculate success/failure counts (already calculated by downloadQueue)
    const failureCount = failedDownloads.length;

    logger.log(`[Screenshot Downloader] Download completed: ${successCount} successful, ${failureCount} failed`);

    // Build platform success summary
    const platformSuccessSummary = Object.entries(platformResults)
      .filter(([, progress]) => progress.total > 0)
      .map(([platform, progress]) => `${platform}: ${progress.successful}/${progress.total}`)
      .join(", ");

    // Show completion message with platform breakdown
    if (failureCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Screenshots downloaded";
      toast.message = `All ${successCount} screenshots saved | ${platformSuccessSummary}`;

      await showHUD(
        `✓ Downloaded all ${successCount} screenshots across ${Object.keys(platformResults).filter((p) => platformResults[p].total > 0).length} platforms`,
      );
    } else if (successCount > 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Screenshots partially downloaded";
      toast.message = `${successCount}/${totalScreenshots} saved | ${platformSuccessSummary}`;

      // Group failures by platform for detailed reporting
      const failuresByPlatform: Record<string, number> = {};
      failedDownloads.forEach((f) => {
        failuresByPlatform[f.platform] = (failuresByPlatform[f.platform] || 0) + 1;
      });

      const failureSummary = Object.entries(failuresByPlatform)
        .map(([platform, count]) => `${platform}: ${count} failed`)
        .join(", ");

      logger.warn(`[Screenshot Downloader] Partial success - ${failureSummary}`);

      await showFailureToast({
        title: `${failureCount} downloads failed`,
        message: `Successful: ${platformSuccessSummary}`,
      });

      await showHUD(`⚠ ${successCount}/${totalScreenshots} screenshots downloaded. Check logs for failed URLs.`);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No screenshots downloaded";
      toast.message = "All downloads failed";

      // Group failures by platform
      const failuresByPlatform: Record<string, number> = {};
      failedDownloads.forEach((f) => {
        failuresByPlatform[f.platform] = (failuresByPlatform[f.platform] || 0) + 1;
      });

      const failureSummary = Object.entries(failuresByPlatform)
        .map(([platform, count]) => `${platform}: ${count} failed`)
        .join(", ");

      await showFailureToast({
        title: "All downloads failed",
        message: failureSummary.length > 100 ? `${failureSummary.substring(0, 100)}...` : failureSummary,
      });

      await showHUD("✗ All screenshot downloads failed. Check logs for retry URLs.");

      return ""; // Return empty string to indicate failure
    }

    return screenshotsDir;
  } catch (error) {
    logger.error("[Screenshot Downloader] Error downloading screenshots:", error);
    showFailureToast("Failed to download screenshots");
    return "";
  }
}

/**
 * Main function to download screenshots for an app
 * @param bundleId App bundle ID
 * @param appName App name
 * @param appVersion App version
 * @param price App price
 * @returns Path to the screenshots directory
 */
export async function downloadScreenshots(
  bundleId: string,
  appName = "",
  appVersion = "",
  price = "",
): Promise<string | null> {
  try {
    // Log platform preferences for debugging
    logPlatformPreferences();

    // Create a basic app details object
    let app: AppDetails = {
      bundleId,
      name: appName || bundleId,
      version: appVersion || "",
      price: price || "",
      // Add required fields with default values
      artistName: "",
      artworkUrl60: "",
      id: "", // Will try to populate this from iTunes API
      description: "",
      iconUrl: "",
      sellerName: "",
      genres: [],
      size: "",
      contentRating: "",
      artworkUrl512: "",
      averageUserRating: 0,
      averageUserRatingForCurrentVersion: 0,
      userRatingCount: 0,
      userRatingCountForCurrentVersion: 0,
      releaseDate: "",
    };

    // Get the downloads directory
    const downloadsDir = await getDownloadsDirectory();
    if (!downloadsDir) {
      showFailureToast("Could not determine downloads directory");
      return null;
    }

    // Try to enrich app details with iTunes API data to get the app ID
    try {
      // Create a toast that we can update
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching app details",
        message: `Looking up ${bundleId} in iTunes API...`,
      });

      // Import the iTunes API functions dynamically to avoid circular dependencies
      const { fetchITunesAppDetails, convertITunesResultToAppDetails } = await import("./itunes-api");

      // Fetch app details from iTunes API
      const itunesData = await fetchITunesAppDetails(bundleId);

      if (itunesData) {
        // Convert iTunes data to AppDetails format
        app = convertITunesResultToAppDetails(itunesData, app);
        logger.log(`[Screenshot Downloader] Found app ID: ${app.id} for ${bundleId}`);

        // Update toast to success
        toast.style = Toast.Style.Success;
        toast.title = "App details fetched";
        toast.message = `Found ${app.name} (ID: ${app.id})`;
      } else {
        logger.log(`[Screenshot Downloader] Could not find app ID for ${bundleId} in iTunes API`);

        // Update toast to show we couldn't find the app
        toast.style = Toast.Style.Failure;
        toast.title = "App details incomplete";
        toast.message = `Could not find complete details for ${bundleId}`;
      }
    } catch (error) {
      logger.error(`[Screenshot Downloader] Error fetching app details from iTunes API:`, error);
      // Show error toast
      await showToast({
        style: Toast.Style.Failure,
        title: "Error fetching app details",
        message: `Failed to get details for ${bundleId}`,
      });
      // Continue with the basic app details
    }

    // Import the scraper function dynamically to avoid circular dependencies
    const { scrapeAppStoreScreenshots } = await import("./app-store-scraper");

    // Create a toast for the scraping phase
    const scrapingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching screenshots",
      message: "Analyzing App Store page...",
    });

    try {
      // Scrape screenshots from the App Store
      const screenshots = await scrapeAppStoreScreenshots(app);

      // Log the screenshots array
      logger.log(
        `[Screenshot Downloader] Got ${screenshots ? screenshots.length : "undefined"} screenshots from scraper`,
      );

      if (!screenshots || screenshots.length === 0) {
        scrapingToast.style = Toast.Style.Failure;
        scrapingToast.title = "No screenshots found";
        scrapingToast.message = "This app may not have screenshots available";
        return null;
      }

      // Log platform breakdown
      const platformCounts: Record<string, number> = {};
      screenshots.forEach((s) => {
        platformCounts[s.type] = (platformCounts[s.type] || 0) + 1;
      });

      const platformSummary = Object.entries(platformCounts)
        .map(([platform, count]) => `${platform}: ${count}`)
        .join(", ");

      logger.log(`[Screenshot Downloader] Screenshots by platform: ${platformSummary}`);

      scrapingToast.style = Toast.Style.Success;
      scrapingToast.title = "Screenshots found";
      scrapingToast.message = `Found ${screenshots.length} screenshots (${platformSummary})`;

      // Download the screenshots
      return await downloadAppScreenshots(screenshots, app, downloadsDir);
    } catch (scrapingError) {
      logger.error("[Screenshot Downloader] Error scraping screenshots:", scrapingError);
      scrapingToast.style = Toast.Style.Failure;
      scrapingToast.title = "Failed to fetch screenshots";
      scrapingToast.message = scrapingError instanceof Error ? scrapingError.message : String(scrapingError);
      throw scrapingError;
    }
  } catch (error) {
    logger.error("[Screenshot Downloader] Error in downloadScreenshots:", error);
    showFailureToast("Failed to download screenshots");
    return null;
  }
}
