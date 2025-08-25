// Screenshot downloader utility functions
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { promisify } from "util";
import pLimit from "p-limit";
import { showFailureToast } from "@raycast/utils";
import { showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";
import { AppDetails, PlatformDirectories, PlatformType, ScreenshotInfo } from "../types";
import { getDownloadsDirectory, validateSafePath, sanitizeFilename } from "./paths";
import { logger } from "./logger";
import { getConfigValue } from "../config";

// Promisify fs functions
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

// Configuration constants
const RATE_LIMIT_DELAY_MS = 100;
const DEFAULT_DOWNLOAD_TIMEOUT_SECONDS = 90;
const DEFAULT_MAX_CONCURRENT_DOWNLOADS = 5;
const MIN_CONCURRENT_DOWNLOADS = 1;
const MAX_CONCURRENT_DOWNLOADS = 10;
const MIN_BATCH_TIMEOUT_MS = 180000; // 3 minutes minimum for batch operations
const BATCH_TIMEOUT_MULTIPLIER = 2; // Multiply individual timeout by this factor for batch timeout

/**
 * Validate that a directory path is safe and secure
 * @param dirPath Directory path to validate
 * @throws Error if path is unsafe
 */
function validateDirectoryPath(dirPath: string): void {
  try {
    // Use the centralized path validation
    validateSafePath(dirPath);

    // Additional checks specific to screenshot directories
    const resolvedPath = path.resolve(dirPath);

    // Ensure the path doesn't contain dangerous patterns
    if (resolvedPath.includes("..") || resolvedPath.includes("~")) {
      throw new Error(`Directory path contains unsafe patterns: ${dirPath}`);
    }

    // Check if path is within reasonable bounds (not system directories)
    const systemPaths = ["/bin", "/sbin", "/usr/bin", "/usr/sbin", "/System", "/Library/System"];
    if (systemPaths.some((sysPath) => resolvedPath.startsWith(sysPath))) {
      throw new Error(`Directory path targets system directory: ${dirPath}`);
    }

    logger.log(`[Screenshot Downloader] Directory path validated: ${resolvedPath}`);
  } catch (error) {
    logger.error(`[Screenshot Downloader] Directory path validation failed for: ${dirPath}`, error);
    throw error;
  }
}

/**
 * Validate and create directory with proper permissions
 * @param dirPath Directory path to create
 * @returns Promise<void>
 */
async function ensureSecureDirectory(dirPath: string): Promise<void> {
  try {
    // Validate the directory path first
    validateDirectoryPath(dirPath);

    // Check if directory already exists
    if (fs.existsSync(dirPath)) {
      // Verify it's actually a directory
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${dirPath}`);
      }

      // Check if directory is writable
      try {
        fs.accessSync(dirPath, fs.constants.W_OK);
        logger.log(`[Screenshot Downloader] Directory exists and is writable: ${dirPath}`);
      } catch (accessError) {
        throw new Error(`Directory exists but is not writable: ${dirPath}`);
      }
    } else {
      // Create directory with secure permissions
      await mkdirAsync(dirPath, { recursive: true, mode: 0o755 });
      logger.log(`[Screenshot Downloader] Created secure directory: ${dirPath}`);

      // Verify the directory was created successfully and is writable
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Failed to create directory: ${dirPath}`);
      }

      try {
        fs.accessSync(dirPath, fs.constants.W_OK);
      } catch (accessError) {
        throw new Error(`Created directory is not writable: ${dirPath}`);
      }
    }
  } catch (error) {
    logger.error(`[Screenshot Downloader] Failed to ensure secure directory: ${dirPath}`, error);
    throw error;
  }
}

/**
 * Validate URL for screenshot download
 * @param url URL to validate
 * @returns boolean indicating if URL is safe
 */
function validateScreenshotUrl(url: string): boolean {
  try {
    // Parse URL to validate structure
    const parsedUrl = new URL(url);

    // Only allow HTTPS for security
    if (parsedUrl.protocol !== "https:") {
      logger.warn(`[Screenshot Downloader] Non-HTTPS URL rejected: ${url}`);
      return false;
    }

    // Check for allowed domains (configured in config.ts)
    const allowedDomains = getConfigValue("allowedScreenshotDomains");

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!allowedDomains.includes(hostname)) {
      logger.warn(`[Screenshot Downloader] URL from non-Apple domain rejected: ${hostname}`);
      return false;
    }

    // Check that path looks like an image
    const pathname = parsedUrl.pathname.toLowerCase();
    if (!pathname.endsWith(".png") && !pathname.endsWith(".jpg") && !pathname.endsWith(".jpeg")) {
      logger.warn(`[Screenshot Downloader] Non-image URL rejected: ${url}`);
      return false;
    }

    logger.log(`[Screenshot Downloader] URL validated: ${url}`);
    return true;
  } catch (error) {
    logger.error(`[Screenshot Downloader] URL validation failed: ${url}`, error);
    return false;
  }
}

/**
 * Enhanced download function with improved error handling and security
 * @param url URL to download from
 * @param filePath Path to save the file to
 */
async function downloadFileSecure(url: string, filePath: string): Promise<void> {
  // Validate URL first
  if (!validateScreenshotUrl(url)) {
    throw new Error(`Invalid or unsafe URL: ${url}`);
  }

  // Validate and sanitize the file path
  try {
    validateSafePath(filePath);
  } catch (pathError) {
    throw new Error(
      `Invalid file path: ${filePath} - ${pathError instanceof Error ? pathError.message : String(pathError)}`,
    );
  }

  // Ensure the directory exists and is secure
  const directory = path.dirname(filePath);
  await ensureSecureDirectory(directory);

  const timeoutMs = getDownloadTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    logger.log(`[Screenshot Downloader] Starting secure download: ${url}`);

    // Enhanced fetch with more comprehensive error handling
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "follow",
    });

    // Enhanced response validation
    if (!response.ok) {
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
      };

      logger.error(`[Screenshot Downloader] HTTP error for ${url}:`, errorDetails);

      // Provide more specific error messages
      if (response.status === 404) {
        throw new Error(`Screenshot not found (404): ${url}`);
      } else if (response.status === 403) {
        throw new Error(`Access denied (403): ${url}`);
      } else if (response.status >= 500) {
        throw new Error(`Server error (${response.status}): ${url}`);
      } else {
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`);
      }
    }

    // Validate content type
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/")) {
      logger.warn(`[Screenshot Downloader] Unexpected content type: ${contentType} for ${url}`);
    }

    // Get content length for validation
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > 50 * 1024 * 1024) {
        // 50MB limit
        throw new Error(`File too large: ${size} bytes for ${url}`);
      }
      if (size < 1024) {
        // 1KB minimum
        throw new Error(`File too small: ${size} bytes for ${url}`);
      }
    }

    // Download with size validation
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate downloaded content
    if (buffer.length < 1024) {
      throw new Error(`Downloaded file too small: ${buffer.length} bytes`);
    }

    // Basic image format validation (check for PNG/JPEG magic bytes)
    if (buffer.length >= 8) {
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8;

      if (!isPNG && !isJPEG) {
        logger.warn(`[Screenshot Downloader] Downloaded file doesn't appear to be a valid image: ${url}`);
      }
    }

    // Write file with secure permissions
    await writeFileAsync(filePath, buffer, { mode: 0o644 });

    // Verify file was written successfully
    if (!fs.existsSync(filePath)) {
      throw new Error(`File was not written successfully: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size !== buffer.length) {
      throw new Error(`File size mismatch: expected ${buffer.length}, got ${stats.size}`);
    }

    logger.log(`[Screenshot Downloader] Successfully downloaded: ${filePath} (${buffer.length} bytes)`);

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  } catch (error) {
    // Enhanced error handling with cleanup
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.log(`[Screenshot Downloader] Cleaned up partial download: ${filePath}`);
      } catch (cleanupError) {
        logger.error(`[Screenshot Downloader] Failed to cleanup partial download: ${filePath}`, cleanupError);
      }
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Download timeout after ${timeoutMs / 1000}s: ${url}`);
    }

    // Add URL context to error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Screenshot Downloader] Download failed for ${url}:`, error);
    throw new Error(`Download failed: ${errorMessage}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  downloadTimeoutSeconds: string;
  maxConcurrentDownloads: string;
}

/**
 * Check if any platforms are enabled in preferences
 */
function areAnyPlatformsEnabled(): boolean {
  try {
    const preferences = getPreferenceValues<PlatformPreferences>();
    return (
      preferences.includeIPhone ||
      preferences.includeIPad ||
      preferences.includeMac ||
      preferences.includeAppleTV ||
      preferences.includeAppleWatch ||
      preferences.includeVisionPro
    );
  } catch (error) {
    logger.error(`[Screenshot Downloader] Error reading platform preferences:`, error);
    return true; // Default to true if we can't read preferences
  }
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

    logger.log(`[Screenshot Downloader] Platform preferences - Enabled: [${enabledPlatforms.join(", ")}]`);
    logger.log(`[Screenshot Downloader] Platform preferences - Disabled: [${disabledPlatforms.join(", ")}]`);

    if (enabledPlatforms.length === 0) {
      logger.warn(`[Screenshot Downloader] WARNING: No device types are enabled in preferences!`);
    }
  } catch (error) {
    logger.error(`[Screenshot Downloader] Error reading platform preferences:`, error);
  }
}

/**
 * Get download timeout from config module
 */
function getDownloadTimeoutMs(): number {
  try {
    return getConfigValue("maxDownloadTimeout");
  } catch (error) {
    logger.error(`[Screenshot Downloader] Error reading download timeout from config:`, error);
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
      const filename = sanitizeFilename(`${screenshotNumber}.png`);
      const filePath = path.join(platformDir, filename);

      try {
        await downloadFileSecure(screenshot.url, filePath);

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

    // Create a sanitized folder name using centralized sanitization
    const sanitizedAppName = sanitizeFilename(app.name.split(":")[0].trim() || "Unknown App");
    const folderName = sanitizeFilename(`${sanitizedAppName} Screenshots`);
    const screenshotsDir = path.join(downloadsDir, folderName);

    // Validate the final screenshots directory path
    try {
      validateDirectoryPath(screenshotsDir);
    } catch (pathError) {
      const errorMsg = `Invalid screenshots directory path: ${pathError instanceof Error ? pathError.message : String(pathError)}`;
      logger.error(`[Screenshot Downloader] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Create the directory using secure method
    await ensureSecureDirectory(screenshotsDir);

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
    const allPlatformTypes: PlatformType[] = ["iPhone", "iPad", "Mac", "AppleTV", "AppleWatch", "VisionPro"];

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
export async function downloadScreenshots(bundleId: string, appName = "", appVersion = ""): Promise<string | null> {
  try {
    // Log platform preferences for debugging
    logPlatformPreferences();

    // Create a basic app details object
    let app: AppDetails = {
      bundleId,
      name: appName || bundleId,
      version: appVersion || "",
      price: "0",
      currency: "USD", // Default currency
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

        // Check if no platforms are enabled in preferences
        if (!areAnyPlatformsEnabled()) {
          scrapingToast.title = "No Screenshots To Download!";
          scrapingToast.message = "To download screenshots, enable at least one device type in preferences.";
        } else {
          scrapingToast.title = "No screenshots found";
          scrapingToast.message = "This app may not have screenshots available";
        }

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
