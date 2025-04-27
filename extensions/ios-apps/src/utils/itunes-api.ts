// iTunes API utility functions
import nodeFetch from "node-fetch";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { showToast, Toast, showHUD } from "@raycast/api";
import { AppDetails, ITunesResponse, ITunesResult } from "../types";
import { getDownloadsDirectory } from "./paths";
import { scrapeAppStoreScreenshots, getHighestResolutionUrl, ScreenshotInfo } from "./scraper";

// Handle both ESM and CommonJS versions of node-fetch
const fetch = nodeFetch;
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Convert iTunes API result to AppDetails format
 * @param itunesData iTunes API result
 * @param baseDetails Optional base details to merge with
 * @returns Formatted AppDetails object
 */
export function convertITunesResultToAppDetails(
  itunesData: ITunesResult,
  baseDetails?: Partial<AppDetails>,
): AppDetails {
  // Start with base details or empty object
  const base = baseDetails || {};

  return {
    // Use base details as fallback
    id: itunesData.trackId?.toString() || base.id || "",
    name: itunesData.trackName || base.name || "",
    version: itunesData.version || base.version || "",
    bundleId: itunesData.bundleId || base.bundleId || "",
    description: itunesData.description || base.description || "",
    // Set the iconUrl as a fallback using the highest resolution available
    iconUrl: itunesData.artworkUrl512 || itunesData.artworkUrl100 || itunesData.artworkUrl60 || base.iconUrl || "",
    sellerName: itunesData.sellerName || base.sellerName || "Unknown Developer",
    price: itunesData.price?.toString() || base.price || "0",
    genres: itunesData.genres && itunesData.genres.length > 0 ? itunesData.genres : base.genres || [],
    size: itunesData.fileSizeBytes || base.size || "0",
    contentRating: itunesData.contentAdvisoryRating || base.contentRating || "",
    // Set the artwork URLs from iTunes API
    artworkUrl60: itunesData.artworkUrl60 || base.artworkUrl60,
    artworkUrl512: itunesData.artworkUrl512 || base.artworkUrl512,
    // Additional iTunes-specific fields
    averageUserRating: itunesData.averageUserRating || base.averageUserRating,
    averageUserRatingForCurrentVersion:
      itunesData.averageUserRatingForCurrentVersion || base.averageUserRatingForCurrentVersion,
    userRatingCount: itunesData.userRatingCount || base.userRatingCount,
    userRatingCountForCurrentVersion:
      itunesData.userRatingCountForCurrentVersion || base.userRatingCountForCurrentVersion,
    releaseDate: itunesData.releaseDate || base.releaseDate,
    currentVersionReleaseDate: itunesData.currentVersionReleaseDate || base.currentVersionReleaseDate,
    trackViewUrl: itunesData.trackViewUrl || base.trackViewUrl,
    artistViewUrl: itunesData.artistViewUrl || base.artistViewUrl,
    screenshotUrls: itunesData.screenshotUrls || base.screenshotUrls,
  };
}

/**
 * Fetch app details from iTunes Search API
 * @param bundleId Bundle ID of the app
 * @returns iTunes app details or null if not found
 */
export async function fetchITunesAppDetails(bundleId: string): Promise<ITunesResult | null> {
  try {
    console.log(`[iTunes API] Fetching app details for bundleId: ${bundleId}`);
    const url = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=us&entity=software`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[iTunes API] Request failed with status: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ITunesResponse;

    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      console.log(`[iTunes API] No results found for bundleId: ${bundleId}`);
      return null;
    }

    console.log(`[iTunes API] Successfully retrieved details for ${bundleId}`);
    return data.results[0];
  } catch (error) {
    console.error(`[iTunes API] Error fetching details: ${error}`);
    return null;
  }
}

/**
 * Search for apps using iTunes Search API
 * @param term Search term
 * @param limit Maximum number of results to return
 * @returns Array of iTunes search results
 */
export async function searchITunesApps(term: string, limit = 20): Promise<ITunesResult[]> {
  try {
    console.log(`[iTunes API] Searching for apps with term: "${term}", limit: ${limit}`);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=us&entity=software&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[iTunes API] Search request failed with status: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as ITunesResponse;

    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      console.log(`[iTunes API] No search results found for term: "${term}"`);
      return [];
    }

    console.log(`[iTunes API] Found ${data.resultCount} results for term: "${term}"`);
    return data.results;
  } catch (error) {
    console.error(`[iTunes API] Error searching apps: ${error}`);
    return [];
  }
}

/**
 * Enriches app details with data from iTunes API
 */
export async function enrichAppDetails(app: AppDetails): Promise<AppDetails> {
  try {
    console.log(`[iTunes API] Enriching app details for bundleId: ${app.bundleId}`);
    const itunesData = await fetchITunesAppDetails(app.bundleId);

    if (itunesData) {
      console.log(`[iTunes API] Successfully retrieved iTunes data for ${app.bundleId}`);
      // Use the utility function to convert iTunes data to AppDetails
      return convertITunesResultToAppDetails(itunesData, app);
    }

    console.log(`[iTunes API] No iTunes data found for ${app.bundleId}, using basic details only`);
    // If no iTunes data, ensure genres is at least an empty array and iconUrl is set
    return {
      ...app,
      genres: app.genres || [],
      sellerName: app.sellerName || "Unknown Developer",
      // Ensure iconUrl is set even if empty
      iconUrl: app.iconUrl || "",
    };
  } catch (error) {
    console.error("[iTunes API] Error enriching app details:", error);
    // Ensure genres is at least an empty array and iconUrl is set
    return {
      ...app,
      genres: app.genres || [],
      sellerName: app.sellerName || "Unknown Developer",
      // Ensure iconUrl is set even if empty
      iconUrl: app.iconUrl || "",
    };
  }
}

/**
 * Download app screenshots from App Store website
 * @param bundleId Bundle ID of the app
 * @param appName App name for folder naming
 * @param appVersion App version for folder naming
 * @param price App price for folder naming
 * @returns Path to the downloaded screenshots directory or null if failed
 */
export async function downloadScreenshots(
  bundleId: string,
  appName = "",
  appVersion = "",
  price = "0",
): Promise<string | null> {
  try {
    console.log(
      `[Screenshot Downloader] Starting screenshot download for bundleId: ${bundleId}, app: ${appName}, version: ${appVersion}`,
    );

    // Show initial HUD
    await showHUD(`Downloading screenshots for ${appName || bundleId}...`, { clearRootSearch: true });

    // First, get basic app details if we don't have them already
    let appDetails: AppDetails | null = null;

    // Try to get app details from iTunes API
    console.log(`[Screenshot Downloader] Fetching app details for ${bundleId}`);
    const itunesData = await fetchITunesAppDetails(bundleId);

    if (itunesData) {
      // Convert iTunes data to AppDetails
      appDetails = convertITunesResultToAppDetails(itunesData);
    } else if (appName) {
      // If we couldn't get details by bundleId but have an app name, try searching
      console.log(`[Screenshot Downloader] Trying to find app by name: ${appName}`);
      const searchResults = await searchITunesApps(appName, 10);

      // Find the exact match or use the first result
      const matchingApp = searchResults.find((app) => app.bundleId === bundleId) || searchResults[0];

      if (matchingApp) {
        appDetails = convertITunesResultToAppDetails(matchingApp);
      }
    }

    // If we still don't have app details, create a minimal object
    if (!appDetails) {
      console.log(`[Screenshot Downloader] Creating minimal app details for ${bundleId}`);
      appDetails = {
        id: "",
        bundleId,
        name: appName || bundleId,
        version: appVersion,
        description: "",
        iconUrl: "",
        sellerName: "",
        price: price,
        genres: [],
        size: "",
        contentRating: "",
        artworkUrl60: undefined,
      };
    }

    // Now use the scraper to get high-resolution screenshots from the App Store website
    console.log(`[Screenshot Downloader] Scraping App Store website for high-resolution screenshots`);
    const screenshots = await scrapeAppStoreScreenshots(appDetails);

    if (screenshots.length === 0) {
      console.error(`[Screenshot Downloader] No screenshots found for ${bundleId}`);
      await showToast(
        Toast.Style.Failure,
        "No screenshots found",
        `No screenshots available for ${appName || bundleId}`,
      );
      return null;
    }

    console.log(`[Screenshot Downloader] Found ${screenshots.length} screenshots for ${bundleId}`);

    // Create a directory for the screenshots
    const downloadsDir = getDownloadsDirectory();
    const sanitizedAppName = (appName || bundleId).replace(/[/\\?%*:|"<>]/g, "-");
    const sanitizedVersion = appVersion.replace(/[/\\?%*:|"<>]/g, "-");
    const priceLabel = price === "0" ? "free" : `${price}usd`;
    const folderName = `${sanitizedAppName}_${sanitizedVersion}_${priceLabel}_screenshots_hires`;
    const screenshotsDir = path.join(downloadsDir, folderName);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
      console.log(`[Screenshot Downloader] Creating screenshots directory: ${screenshotsDir}`);
      await mkdirAsync(screenshotsDir, { recursive: true });
    }

    // Create device-specific directories
    const deviceDirs: { [key: string]: string } = {
      iPhone: path.join(screenshotsDir, "iPhone"),
      iPad: path.join(screenshotsDir, "iPad"),
      Mac: path.join(screenshotsDir, "Mac"),
      AppleTV: path.join(screenshotsDir, "AppleTV"),
    };

    // Group screenshots by device type to avoid creating empty directories
    const screenshotsByType: Record<string, ScreenshotInfo[]> = {};

    // Initialize the device type groups
    for (const screenshot of screenshots) {
      if (!screenshotsByType[screenshot.type]) {
        screenshotsByType[screenshot.type] = [];
      }
      screenshotsByType[screenshot.type].push(screenshot);
    }

    // Only create directories for device types that have screenshots
    for (const [deviceType, deviceScreenshots] of Object.entries(screenshotsByType)) {
      if (deviceScreenshots.length > 0) {
        const dir = deviceDirs[deviceType as keyof typeof deviceDirs];
        if (dir && !fs.existsSync(dir)) {
          await mkdirAsync(dir, { recursive: true });
        }
      }
    }

    // Download each screenshot
    await showHUD(`Downloading ${screenshots.length} high-resolution screenshots...`);

    const downloadPromises = screenshots.map(async (screenshot) => {
      try {
        // Get the highest resolution URL
        const highResUrl = getHighestResolutionUrl(screenshot.url);
        console.log(
          `[Screenshot Downloader] Downloading ${screenshot.type} screenshot ${screenshot.index + 1}: ${highResUrl}`,
        );

        // Fetch the image
        const response = await fetch(highResUrl);
        if (!response.ok) {
          console.error(`[Screenshot Downloader] Failed to download screenshot: HTTP ${response.status}`);
          return false;
        }

        // Get the image data as buffer
        const imageBuffer = await response.buffer();

        // Always use PNG for consistency and best quality
        const fileExtension = "png";

        // Save the image to the appropriate device directory
        const deviceDir = deviceDirs[screenshot.type];
        const fileName = `${screenshot.type.toLowerCase()}_${screenshot.index + 1}.${fileExtension}`;
        const filePath = path.join(deviceDir, fileName);

        await writeFileAsync(filePath, imageBuffer);
        console.log(
          `[Screenshot Downloader] Saved ${screenshot.type} screenshot ${screenshot.index + 1} to ${filePath}`,
        );
        return true;
      } catch (error) {
        console.error(`[Screenshot Downloader] Error downloading screenshot:`, error);
        return false;
      }
    });

    // Wait for all downloads to complete
    const results = await Promise.all(downloadPromises);
    const successCount = results.filter((result) => result).length;

    if (successCount === 0) {
      console.error(`[Screenshot Downloader] Failed to download any screenshots for ${bundleId}`);
      await showToast(Toast.Style.Failure, "Download failed", "Failed to download any screenshots");
      return null;
    }

    // Create a README file with information about the app and screenshots
    const readmePath = path.join(screenshotsDir, "README.txt");
    const readmeContent = [
      `App Store Screenshots (High Resolution)`,
      `=====================================`,
      ``,
      `App Name: ${appDetails.name}`,
      `Bundle ID: ${appDetails.bundleId}`,
      `App ID: ${appDetails.id}`,
      `Version: ${appDetails.version}`,
      ``,
      `Downloaded on: ${new Date().toISOString()}`,
      ``,
      `Organization:`,
      ...Object.entries(screenshotsByType)
        .filter(([, screenshots]) => screenshots.length > 0)
        .map(
          ([deviceType, screenshots]) => `- ${deviceType}/: Contains ${screenshots.length} ${deviceType} screenshots`,
        ),
      ``,
      `These screenshots were obtained at the highest available resolution from the App Store.`,
      `They may be used for reference purposes only and are subject to Apple's copyright.`,
    ].join("\n");

    await writeFileAsync(readmePath, readmeContent);

    console.log(
      `[Screenshot Downloader] Successfully downloaded ${successCount}/${screenshots.length} screenshots for ${bundleId}`,
    );
    await showToast(
      Toast.Style.Success,
      "High-resolution screenshots downloaded",
      `${successCount} screenshots saved to ${folderName}`,
    );

    return screenshotsDir;
  } catch (error) {
    console.error(`[Screenshot Downloader] Error downloading screenshots for ${bundleId}:`, error);
    await showToast(Toast.Style.Failure, "Error downloading screenshots", String(error));
    return null;
  }
}
