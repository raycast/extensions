// App Store web scraper utility functions using Shoebox JSON method
import nodeFetch from "node-fetch";
import { AppDetails, PlatformType, ScreenshotInfo, PlatformPreferences } from "../types";
import { logger } from "./logger";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { APP_STORE_BASE_URL } from "./constants";
import { handleToolError } from "./error-handler";

/**
 * Raw screenshot data from App Store Shoebox JSON
 */
interface RawScreenshotData {
  url: string;
  width?: number;
  height?: number;
  bgColor?: string;
}

/**
 * Platform data structure from App Store Shoebox JSON
 */
interface PlatformData {
  customAttributes?: {
    default?: {
      default?: {
        customScreenshotsByType?: Record<string, RawScreenshotData[]>;
      };
    };
  };
}

// App Store constants (imported from centralized constants)

// App Store image resolution constants
const APP_STORE_IMAGE_RESOLUTIONS = {
  HIGHEST: "2000x0w", // Highest resolution typically available
  MEDIUM: "1000x0w", // Medium resolution
  LOW: "500x0w", // Lower resolution for bandwidth-constrained environments
};

// Platform-specific maximum resolutions based on Apple's CDN capabilities (as of 2025)
// These are the highest resolutions available for each platform's screenshots
const PLATFORM_MAX_RESOLUTIONS: Record<PlatformType, string> = {
  iPhone: "1290x0w", // Matches 6.7" iPhone screenshots
  iPad: "2048x0w", // Matches 12.9" iPad Pro screenshots
  Mac: "2560x0w", // Native macOS resolution; often retina
  AppleTV: "3840x0w", // Matches 4K Apple TV screenshots
  AppleWatch: "396x0w", // Matches Apple Watch Ultra screenshots
  VisionPro: "3840x0w", // Highest fidelity immersive images
};

/**
 * Transform mzstatic.com URLs to get the highest resolution PNG version
 * @param url Screenshot URL from the App Store
 * @param platformType Platform type to determine maximum resolution
 * @param resolution Optional target resolution override
 * @returns URL to the highest resolution PNG version
 */
export function getHighestResolutionUrl(url: string, platformType?: PlatformType, resolution?: string): string {
  try {
    // Only process mzstatic.com URLs or paths with thumb images
    if (url.includes("mzstatic.com/image/thumb/") || url.includes("image/thumb")) {
      // Determine the target resolution
      let targetResolution: string;

      if (resolution) {
        // Use explicit resolution override
        targetResolution = resolution;
      } else if (platformType && PLATFORM_MAX_RESOLUTIONS[platformType]) {
        // Use platform-specific maximum resolution
        targetResolution = PLATFORM_MAX_RESOLUTIONS[platformType];

        // Ensure minimum resolution of 2000x0w for platforms that support it
        // Only apply minimum for platforms that normally exceed 2000px width
        if (
          platformType === "iPad" ||
          platformType === "Mac" ||
          platformType === "AppleTV" ||
          platformType === "VisionPro"
        ) {
          const currentWidth = parseInt(targetResolution.split("x")[0]);
          if (currentWidth < 2000) {
            targetResolution = APP_STORE_IMAGE_RESOLUTIONS.HIGHEST; // 2000x0w
          }
        }
      } else {
        // Fallback to default highest resolution
        targetResolution = APP_STORE_IMAGE_RESOLUTIONS.HIGHEST;
      }

      // Detect the pattern .../{w}x{h}{c}.{f} (c can be empty or e.g. 'bb')
      const patternMatch = url.match(/\/([0-9]+)x([0-9]+)([a-z]*)\.([a-z]+)$/i);

      if (patternMatch) {
        // Extract the base part of the URL (before the resolution pattern)
        const basePart = url.substring(0, url.lastIndexOf("/") + 1);

        // Use target resolution with PNG format for highest quality
        return `${basePart}${targetResolution}.png`;
      }

      // Fallback to the original logic if no pattern is detected
      const basePart = url.substring(0, url.lastIndexOf("/") + 1);
      return `${basePart}${targetResolution}.png`;
    }

    logger.log(`[Scraper] URL not from mzstatic.com: ${url}`);
    return url;
  } catch (error) {
    logger.error("[Scraper] Error transforming URL:", error);
    return url;
  }
}

/**
 * Get enabled platforms from preferences
 * @returns Array of enabled platform types
 */
function getEnabledPlatforms(): PlatformType[] {
  try {
    const preferences = getPreferenceValues<PlatformPreferences>();
    const enabledPlatforms: PlatformType[] = [];

    if (preferences.includeIPhone) enabledPlatforms.push("iPhone");
    if (preferences.includeIPad) enabledPlatforms.push("iPad");
    if (preferences.includeMac) enabledPlatforms.push("Mac");
    if (preferences.includeAppleTV) enabledPlatforms.push("AppleTV");
    if (preferences.includeAppleWatch) enabledPlatforms.push("AppleWatch");
    if (preferences.includeVisionPro) enabledPlatforms.push("VisionPro");

    return enabledPlatforms;
  } catch (error) {
    logger.error("[Scraper] Error reading preferences, defaulting to all platforms:", error);
    // Default to all platforms if preferences can't be read
    return ["iPhone", "iPad", "Mac", "AppleTV", "AppleWatch", "VisionPro"];
  }
}

/**
 * Validate that at least one platform is enabled
 * @param platforms Array of enabled platforms
 * @returns True if at least one platform is enabled
 */
async function validateEnabledPlatforms(platforms: PlatformType[]): Promise<boolean> {
  if (platforms.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to download!",
      message: "Enable at least one platform in Preferences to download screenshots.",
    });
    return false;
  }
  return true;
}

/**
 * Get the App Store URL for an app
 * @param app App details
 * @returns App Store URL
 */
export function getAppStoreUrl(app: AppDetails): string {
  // Use the trackViewUrl if available
  if (app.trackViewUrl) {
    return app.trackViewUrl;
  }

  // If we have an app ID, construct the URL with it
  if (app.id) {
    return `${APP_STORE_BASE_URL}/us/app/id${app.id}`;
  }

  // If we don't have an ID or trackViewUrl, use the bundleId to search
  // This creates a search URL that will redirect to the app if found
  const sanitizedName = app.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `${APP_STORE_BASE_URL}/us/app/${sanitizedName}/id${app.bundleId}`;
}

/**
 * Scrape screenshots from the App Store using shoebox JSON extraction
 * @param app App details
 * @param platforms Optional platform override (falls back to preferences)
 * @returns Array of screenshot information objects
 */
export async function scrapeAppStoreScreenshots(
  app: AppDetails,
  platforms?: PlatformType[],
): Promise<ScreenshotInfo[]> {
  logger.log(`[Scraper] Scraping screenshots for ${app.name} (${app.bundleId})`);

  // Get enabled platforms from preferences or use override
  const enabledPlatforms = platforms || getEnabledPlatforms();

  // Validate that at least one platform is enabled
  if (!(await validateEnabledPlatforms(enabledPlatforms))) {
    return [];
  }

  logger.log(`[Scraper] Enabled platforms: ${enabledPlatforms.join(", ")}`);

  try {
    // Fetch the App Store page (base URL without platform-specific parameters)
    const baseUrl = getAppStoreUrl(app);
    logger.log(`[Scraper] Fetching App Store page: ${baseUrl}`);

    const response = await nodeFetch(baseUrl);
    if (!response.ok) {
      await handleToolError(
        new Error(`Failed to fetch App Store page: ${response.status}`),
        "app-store-scraper",
        "Failed to fetch App Store page",
        false, // Don't throw, return empty array instead
      );
      return [];
    }

    const html = await response.text();

    // Extract screenshots from shoebox JSON
    const allScreenshots = extractScreenshotsFromShoeboxJson(html);
    logger.log(`[Scraper] Found ${allScreenshots.length} screenshots from base shoebox JSON`);

    // All screenshots are now extracted from the base shoebox JSON
    logger.log(
      `[Scraper] Extracted screenshots by platform: ${JSON.stringify(
        allScreenshots.reduce(
          (acc, s) => {
            acc[s.type] = (acc[s.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      )}`,
    );

    // Filter by enabled platforms
    const filteredScreenshots = filterScreenshotsByPlatforms(allScreenshots, enabledPlatforms);

    // Remove duplicates
    const uniqueScreenshots = filterUniqueScreenshots(filteredScreenshots);

    logger.log(`[Scraper] Found ${uniqueScreenshots.length} total unique screenshots for enabled platforms`);

    return uniqueScreenshots;
  } catch (error) {
    logger.error("[Scraper] Error scraping screenshots:", error);
    return [];
  }
}

/**
 * Filter screenshots by enabled platforms
 * @param screenshots All screenshots
 * @param enabledPlatforms Enabled platform types
 * @returns Filtered screenshots
 */
export function filterScreenshotsByPlatforms(
  screenshots: ScreenshotInfo[],
  enabledPlatforms: PlatformType[],
): ScreenshotInfo[] {
  return screenshots.filter((screenshot) => enabledPlatforms.includes(screenshot.type));
}

/**
 * Filter out duplicate screenshots based on URL
 * Since Shoebox JSON provides clean data, we only need simple URL deduplication
 * @param screenshots Array of screenshot information objects
 * @returns Array of unique screenshot information objects
 */
function filterUniqueScreenshots(screenshots: ScreenshotInfo[]): ScreenshotInfo[] {
  const seen = new Set<string>();
  return screenshots.filter((screenshot) => {
    if (seen.has(screenshot.url)) {
      return false;
    }
    seen.add(screenshot.url);
    return true;
  });
}

/**
 * Extract screenshots from the shoebox JSON blob in the App Store HTML
 *
 * This function implements a sophisticated parsing strategy to extract screenshot data from
 * Apple's "shoebox" JSON structure embedded in App Store web pages. The shoebox contains
 * nested JSON data that requires multi-step parsing and deep path traversal.
 *
 * ⚠️ IMPORTANT: Apple may change the App Store's internal structure at any time. This helper
 * is designed to fail gracefully if the structure changes, with multiple fallback paths and
 * comprehensive error handling to minimize disruption.
 *
 * @param html App Store HTML content containing shoebox JSON
 * @returns Array of screenshot information objects, empty array if parsing fails
 *
 * @see {@link https://github.com/your-repo/ios-apps/blob/main/__tests__/scraper.test.ts} for comprehensive tests
 */
export function extractScreenshotsFromShoeboxJson(html: string): ScreenshotInfo[] {
  const screenshots: ScreenshotInfo[] = [];

  try {
    // STEP 1: Extract the shoebox JSON from the HTML
    // The shoebox data is embedded in a script tag with a specific ID
    const shoeboxRegex =
      /<script type="fastboot\/shoebox" id="shoebox-media-api-cache-apps"[^>]*>([\s\S]*?)<\/script>/i;
    const shoeboxMatch = html.match(shoeboxRegex);

    if (!shoeboxMatch || !shoeboxMatch[1]) {
      logger.log(`[Scraper] No shoebox JSON found in HTML`);
      return screenshots;
    }

    // STEP 2: Parse the outer JSON structure
    let outerJsonData;
    try {
      const jsonContent = shoeboxMatch[1].trim();
      outerJsonData = JSON.parse(jsonContent);

      // Validate that we have a proper JSON object
      if (!outerJsonData || typeof outerJsonData !== "object") {
        logger.log(`[Scraper] Invalid JSON data in shoebox: not an object`);
        return screenshots;
      }
    } catch (error) {
      logger.error(`[Scraper] Error parsing shoebox JSON content:`, error);
      return screenshots;
    }

    // STEP 3: Define device type to platform mapping
    // This mapping is based on actual App Store device identifiers observed in shoebox data.
    // ⚠️ These identifiers may change if Apple updates their internal naming conventions.
    // 📊 Data source: Audited 5 real Shoebox JSON fixtures (Instagram, Netflix, Spotify, Word, YouTubeTV)
    //     and found 20 unique deviceType keys across all fixtures.
    const deviceTypeToPlatform: Record<string, PlatformType> = {
      // iPhone models - based on actual App Store identifiers found in fixtures
      iphone: "iPhone", // Found in: Netflix
      iphone5: "iPhone", // Found in: Instagram, Netflix
      iphone6: "iPhone", // Found in: Netflix
      "iphone6+": "iPhone", // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
      iphone_5_8: "iPhone", // Found in: Netflix
      iphone_6_5: "iPhone", // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
      iphone_d73: "iPhone", // Found in: Netflix
      iphone_d74: "iPhone", // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV

      // iPad models - based on actual App Store identifiers found in fixtures
      ipad: "iPad", // Found in: Instagram, Netflix
      ipad_10_5: "iPad", // Found in: Instagram, Netflix
      ipad_11: "iPad", // Found in: Netflix
      ipadPro: "iPad", // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV
      ipadPro_2018: "iPad", // Found in: Instagram, Netflix, Spotify, Word, YouTubeTV

      // Apple TV models - based on actual App Store identifiers found in fixtures
      appleTV: "AppleTV", // Found in: Instagram, Netflix, Spotify, YouTubeTV

      // Apple Watch models - based on actual App Store identifiers found in fixtures
      appleWatch: "AppleWatch", // Found in: Spotify, Word
      appleWatch_2018: "AppleWatch", // Found in: Spotify, YouTubeTV
      appleWatch_2021: "AppleWatch", // Found in: Instagram, Spotify, Word, YouTubeTV
      appleWatch_2022: "AppleWatch", // Found in: Spotify

      // Vision Pro - based on actual App Store identifiers found in fixtures
      appleVisionPro: "VisionPro", // Found in: Netflix, Word, YouTubeTV

      // Mac - based on actual App Store identifiers found in fixtures
      mac: "Mac", // Found in: Netflix, Word

      // Legacy/fallback mappings for compatibility
      // These weren't found in current fixtures but may exist in other apps
      iphone_5_5: "iPhone",
      iphone_6_1: "iPhone",
      iphone_6_7: "iPhone",
      ipadpro: "iPad", // Lowercase variant
      ipadpro_2018: "iPad", // Lowercase variant
      ipad_pro: "iPad",
      ipad_pro_129: "iPad",
      ipad_pro_11: "iPad",
      ipad_air: "iPad",
      ipad_mini: "iPad",
      appletv: "AppleTV", // Lowercase variant
      apple_tv: "AppleTV",
      tv: "AppleTV",
      applewatch: "AppleWatch", // Lowercase variant
      apple_watch: "AppleWatch",
      watch: "AppleWatch",
      applevision: "VisionPro",
      visionpro: "VisionPro", // Lowercase variant
      vision: "VisionPro",
      macbook: "Mac",
      imac: "Mac",
    };

    // STEP 4: Process each entry in the outer JSON
    // The outer JSON contains multiple keys, each potentially holding app data
    let index = 0;
    const allScreenshotsByType: Record<string, RawScreenshotData[]>[] = [];

    for (const [key, value] of Object.entries(outerJsonData)) {
      let innerObject;

      // Handle both string and object values - some values are double-encoded JSON strings
      if (typeof value === "string") {
        try {
          innerObject = JSON.parse(value);
        } catch (error) {
          logger.log(`[Scraper] Failed to parse inner JSON for key ${key}:`, error);
          continue;
        }
      } else {
        innerObject = value;
      }

      // STEP 5: Navigate the complex nested structure to find screenshot data
      // Path: d[0].attributes.platformAttributes[platform].customAttributes.default.default.customScreenshotsByType
      // This path structure is based on observed App Store data and may change in future updates
      if (!innerObject || !innerObject.d || !innerObject.d[0] || !innerObject.d[0].attributes) {
        continue;
      }

      const appAttributes = innerObject.d[0].attributes;

      // Try platform-specific attributes first (primary path)
      if (appAttributes.platformAttributes) {
        for (const [platform, platformData] of Object.entries(appAttributes.platformAttributes)) {
          // Safely check if platformData has the expected structure
          if (
            platformData &&
            typeof platformData === "object" &&
            platformData !== null &&
            "customAttributes" in platformData
          ) {
            const typedPlatformData = platformData as PlatformData; // Type assertion for deep property access
            if (
              typedPlatformData.customAttributes &&
              typedPlatformData.customAttributes.default &&
              typedPlatformData.customAttributes.default.default &&
              typedPlatformData.customAttributes.default.default.customScreenshotsByType
            ) {
              // Found screenshot data in platform-specific attributes
              allScreenshotsByType.push(typedPlatformData.customAttributes.default.default.customScreenshotsByType);
              logger.log(`[Scraper] Found screenshots in ${platform} platformAttributes`);
            }
          }
        }
      }

      // Fallback: Check main customAttributes if platform-specific paths fail
      // This provides resilience if Apple changes the structure
      if (
        appAttributes.customAttributes &&
        appAttributes.customAttributes.default &&
        appAttributes.customAttributes.default.default &&
        appAttributes.customAttributes.default.default.customScreenshotsByType
      ) {
        allScreenshotsByType.push(appAttributes.customAttributes.default.default.customScreenshotsByType);
        logger.log(`[Scraper] Found screenshots in main customAttributes`);
      }
    }

    // Early exit if no screenshot data was found
    if (allScreenshotsByType.length === 0) {
      logger.log(`[Scraper] No screenshot data found in any location`);
      return screenshots;
    }

    // STEP 6: Process all collected screenshot dictionaries
    // Transform device types to platform types and collect screenshot URLs

    // Process regular screenshots from customScreenshotsByType
    for (const screenshotsByType of allScreenshotsByType) {
      for (const [deviceType, screenshotsArray] of Object.entries(screenshotsByType)) {
        // Map Apple's internal device identifiers to our platform types using exact key lookup
        const platformType = deviceTypeToPlatform[deviceType];

        // Skip unknown device types and log them
        if (!platformType) {
          logger.log(`[Scraper] Skipping unknown device type: ${deviceType}`);
          continue;
        }

        logger.log(`[Scraper] Processing ${deviceType} screenshots, mapped to platform: ${platformType}`);

        // Process each screenshot URL for this device type
        if (Array.isArray(screenshotsArray)) {
          screenshotsArray.forEach((screenshot) => {
            if (screenshot && screenshot.url) {
              screenshots.push({
                url: getHighestResolutionUrl(screenshot.url, platformType), // Transform to platform-specific highest resolution
                type: platformType,
                index: index++, // Maintain sequential ordering
              });
            }
          });
        }
      }
    }

    logger.log(`[Scraper] Extracted ${screenshots.length} screenshots from shoebox JSON`);
  } catch (error) {
    logger.error(`[Scraper] Error parsing shoebox JSON:`, error);
    // Return any screenshots we may have found before the error
    return screenshots;
  }

  return screenshots;
}
