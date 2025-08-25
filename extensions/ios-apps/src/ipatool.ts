import { AppDetails, IpaToolSearchApp, IpaToolSearchResponse } from "./types";
import { convertITunesResultToAppDetails, fetchITunesAppDetails } from "./utils/itunes-api";
import { ensureAuthenticated } from "./utils/auth";
import { execFile, spawn } from "child_process";
import { extractFilePath, safeJsonParse } from "./utils/common";
import fs from "fs";
import path from "path";
import { handleAppSearchError, handleAuthError, handleDownloadError, sanitizeQuery } from "./utils/error-handler";
import { getDownloadsDirectory, IPATOOL_PATH } from "./utils/paths";
import { logger } from "./utils/logger";
import { promisify } from "util";
import { showHUD, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { analyzeIpatoolError } from "./utils/ipatool-error-patterns";
import { getConfig } from "./config";
import { registerTempFile, handleProcessErrorCleanup, cleanupTempFilesByPattern } from "./utils/temp-file-manager";
import { createSecureIpatoolProcess } from "./utils/ipatool-validator";
import AdmZip from "adm-zip";
import https from "https";

// Retry configuration for handling transient network errors
const MAX_RETRIES = 3; // Maximum number of retry attempts
const INITIAL_RETRY_DELAY = 2000; // Initial delay between retries (2 seconds)
const MAX_RETRY_DELAY = 10000; // Maximum delay between retries (10 seconds)

const execFileAsync = promisify(execFile);

// Constants for prerequisite validation
const MIN_DISK_SPACE_MB = 300; // 300 MB fallback if expected size is not available
const BYTES_PER_MB = 1024 * 1024;

// Constants for file integrity verification
const MIN_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB minimum file size

/**
 * Interface for prerequisite validation results
 */
interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  cancelled?: boolean;
}

/**
 * Interface for file integrity verification results
 */
interface IntegrityResult {
  isValid: boolean;
  errorMessage?: string;
  shouldRetry?: boolean;
}

/**
 * Validates download prerequisites before starting app download
 * @param bundleId Bundle identifier of the app
 * @param appName Optional app name for better error messages
 * @param expectedSizeBytes Optional expected app size in bytes
 * @returns Promise<ValidationResult> - validation result
 */
export async function validateDownloadPrereqs(
  bundleId: string,
  appName?: string,
  expectedSizeBytes?: number,
  appVersion?: string,
): Promise<ValidationResult> {
  const displayName = appName || bundleId;
  logger.log(`[validation] Starting prerequisite validation for ${displayName}`);

  try {
    // Get the downloads directory
    const downloadsDir = getDownloadsDirectory();
    logger.log(`[validation] Downloads directory: ${downloadsDir}`);

    // 1. Check write permission to downloads directory
    try {
      await fs.promises.access(downloadsDir, fs.constants.W_OK);
      logger.log(`[validation] ✓ Write permission verified for downloads directory`);
    } catch (error) {
      const errorMsg = `Cannot write to downloads directory: ${downloadsDir}. Please check permissions or change the download path in preferences.`;
      logger.error(`[validation] Write permission check failed:`, error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Permission Error",
        message: "Cannot write to downloads directory",
      });

      return { isValid: false, errorMessage: errorMsg };
    }

    // 2. Check available disk space
    const requiredSpaceBytes = expectedSizeBytes || MIN_DISK_SPACE_MB * BYTES_PER_MB;
    const requiredSpaceMB = Math.ceil(requiredSpaceBytes / BYTES_PER_MB);

    try {
      const stats = await fs.promises.statfs(downloadsDir);
      const availableBytes = stats.bavail * stats.bsize;
      const availableMB = Math.floor(availableBytes / BYTES_PER_MB);

      logger.log(`[validation] Available disk space: ${availableMB} MB, Required: ${requiredSpaceMB} MB`);

      if (availableBytes < requiredSpaceBytes) {
        const errorMsg = `Insufficient disk space. Available: ${availableMB} MB, Required: ${requiredSpaceMB} MB. Please free up space or change download location.`;
        logger.error(`[validation] Insufficient disk space`);

        await showToast({
          style: Toast.Style.Failure,
          title: "Insufficient Disk Space",
          message: `Need ${requiredSpaceMB} MB, have ${availableMB} MB`,
        });

        return { isValid: false, errorMessage: errorMsg };
      }

      logger.log(`[validation] ✓ Sufficient disk space available`);
    } catch (error) {
      logger.warn(`[validation] Could not check disk space, continuing:`, error);
      // Don't fail validation if we can't check disk space, just warn
    }

    // 3. Check for pre-existing target file and prompt for overwrite
    const sanitizedName = appName ? appName.replace(/[/\\?%*:|"<>]/g, "-") : undefined;
    const possibleFilenames = [
      `${bundleId}.ipa`,
      sanitizedName && appVersion ? `${sanitizedName} ${appVersion}.ipa` : undefined,
      sanitizedName ? `${sanitizedName}.ipa` : undefined,
    ].filter(Boolean) as string[];

    let existingFile: string | null = null;
    let existingFileSize = 0;

    // Prefer exact filename matches only
    for (const filename of possibleFilenames) {
      const filePath = path.join(downloadsDir, filename);
      try {
        const stats = await fs.promises.stat(filePath);
        existingFile = filePath;
        existingFileSize = stats.size;
        logger.log(`[validation] Found existing file: ${filePath} (${Math.ceil(existingFileSize / BYTES_PER_MB)} MB)`);
        break;
      } catch {
        // File doesn't exist, continue checking
      }
    }

    // As a last resort, look for very similar files but avoid false positives on short names
    if (!existingFile) {
      const files = await fs.promises.readdir(downloadsDir);
      const lowerName = sanitizedName?.toLowerCase();
      const allowFuzzy = lowerName && lowerName.length >= 3; // avoid matching names like "X"
      const similarFiles = files.filter((file) => {
        if (!file.endsWith(".ipa")) return false;
        if (file.includes(bundleId)) return true; // bundleId is precise
        if (allowFuzzy && lowerName) {
          // start-with is safer than contains for names
          return file.toLowerCase().startsWith(lowerName + " ");
        }
        return false;
      });

      if (similarFiles.length > 0) {
        const filePath = path.join(downloadsDir, similarFiles[0]);
        try {
          const stats = await fs.promises.stat(filePath);
          existingFile = filePath;
          existingFileSize = stats.size;
          logger.log(
            `[validation] Found similar existing file: ${filePath} (${Math.ceil(existingFileSize / BYTES_PER_MB)} MB)`,
          );
        } catch (error) {
          logger.warn(`[validation] Could not stat similar file:`, error);
        }
      }
    }

    if (existingFile) {
      const existingFileMB = Math.ceil(existingFileSize / BYTES_PER_MB);
      const confirmed = await confirmAlert({
        title: "File Already Exists",
        message: `A file for "${displayName}" already exists (${existingFileMB} MB).\n\nDo you want to overwrite it?`,
        primaryAction: {
          title: "Overwrite",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        const errorMsg = "App already exists and won't be  downloaded again.";
        logger.log(`[validation] Skipped download: file already exists (${path.basename(existingFile)})`);

        await showToast({
          style: Toast.Style.Animated,
          title: "App already exists and won't be  downloaded again.",
        });

        return { isValid: false, errorMessage: errorMsg, cancelled: true };
      }

      logger.log(`[validation] ✓ User confirmed overwrite of existing file`);
    } else {
      logger.log(`[validation] ✓ No existing file conflict`);
    }

    // 4. Check network connectivity (try multiple methods with graceful fallbacks)
    try {
      // First try ping if available
      let networkCheckPassed = false;
      let networkError: Error | null = null;

      try {
        const { stdout } = await execFileAsync("ping", ["-c", "1", "-W", "5000", "apple.com"], {
          timeout: 10000,
        });

        if (
          stdout.includes("1 packets transmitted, 1 received") ||
          stdout.includes("1 packets transmitted, 1 packets received")
        ) {
          networkCheckPassed = true;
          logger.log(`[validation] ✓ Network connectivity verified via ping`);
        }
      } catch (pingError) {
        networkError = pingError instanceof Error ? pingError : new Error(String(pingError));
        logger.warn(
          `[validation] Ping command failed (may not be available in this environment): ${networkError.message}`,
        );

        // If ping fails due to command not found, try alternative network check
        if (networkError.message.includes("ENOENT") || networkError.message.includes("spawn ping")) {
          logger.log(`[validation] Ping command not available, trying alternative network check...`);

          try {
            // Try a simple HTTP request to Apple as an alternative
            await new Promise<void>((resolve, reject) => {
              const req = https.request(
                "https://www.apple.com/",
                {
                  method: "HEAD",
                  timeout: 10000,
                },
                (res) => {
                  if (res.statusCode && res.statusCode < 400) {
                    networkCheckPassed = true;
                    logger.log(`[validation] ✓ Network connectivity verified via HTTPS request to apple.com`);
                    resolve();
                  } else {
                    reject(new Error(`HTTP request failed with status ${res.statusCode}`));
                  }
                },
              );

              req.on("error", reject);
              req.on("timeout", () => {
                req.destroy();
                reject(new Error("Request timeout"));
              });

              req.end();
            });
          } catch (httpError) {
            logger.warn(`[validation] Alternative HTTP connectivity check also failed:`, httpError);
            // We'll handle this below
          }
        }
      }

      if (!networkCheckPassed) {
        // Only fail validation if we're confident there's actually no network
        // Give the benefit of the doubt in sandboxed environments
        if (networkError && !networkError.message.includes("ENOENT") && !networkError.message.includes("spawn ping")) {
          const errorMsg = `Network connectivity check failed. Please check your internet connection and try again.`;
          logger.error(`[validation] Network connectivity validation failed`);

          await showToast({
            style: Toast.Style.Failure,
            title: "Network Error",
            message: "Cannot reach apple.com",
          });

          return { isValid: false, errorMessage: errorMsg };
        } else {
          // In sandboxed environments where ping isn't available, just log a warning and continue
          logger.warn(
            `[validation] Network connectivity check inconclusive (ping not available), proceeding with download`,
          );
        }
      }
    } catch (error) {
      // Unexpected error in network check logic
      logger.warn(`[validation] Unexpected error in network connectivity check, proceeding:`, error);
      // Don't fail validation for unexpected network check errors
    }

    logger.log(`[validation] ✓ All prerequisites validated successfully for ${displayName}`);
    return { isValid: true };
  } catch (error) {
    const errorMsg = `Prerequisite validation failed: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`[validation] Validation error:`, error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Validation Error",
      message: "Could not validate download requirements",
    });

    return { isValid: false, errorMessage: errorMsg };
  }
}

/**
 * Secure spawn-based execution to prevent command injection
 */
function spawnAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Checks if an app is free (price is $0) and eligible for automatic purchase
 * @param price The price string from app details
 * @returns boolean - true if app is free and eligible for purchase
 */
export function isFreeApp(price?: string): boolean {
  if (!price) {
    return false;
  }

  // Check if price is exactly "0" or "0.00" or similar free indicators
  const numericPrice = parseFloat(price);
  const isFree = numericPrice === 0;

  logger.log(`[ipatool] App price eligibility check: price="${price}", numeric=${numericPrice}, isFree=${isFree}`);

  return isFree;
}

/**
 * Attempts to purchase an app using ipatool
 * @param bundleId The bundle identifier of the app
 * @param appName Optional app name for logging
 * @returns Promise<boolean> - true if purchase was successful, false otherwise
 */
export async function purchaseApp(
  bundleId: string,
  appName?: string,
  options?: { suppressHUD?: boolean },
): Promise<boolean> {
  try {
    const displayName = appName || bundleId;
    logger.log(`[ipatool] Attempting to purchase app: ${displayName} (${bundleId})`);

    const suppressHUD = options?.suppressHUD ?? false;
    if (!suppressHUD) {
      await showHUD(`Attempting to purchase ${displayName}...`);
    }

    // Execute the purchase command using secure spawn
    const { stdout, stderr } = await spawnAsync(IPATOOL_PATH, [
      "purchase",
      "--bundle-identifier",
      bundleId,
      "--format",
      "json",
      "--non-interactive",
      "--verbose",
    ]);

    logger.log(`[ipatool] Purchase command completed for ${displayName}`);
    logger.log(`[ipatool] stdout: ${stdout}`);

    if (stderr) {
      logger.log(`[ipatool] stderr: ${stderr}`);
    }

    // Normalize and combine outputs for detection and parsing
    const combined = `${stdout}\n${stderr}`;
    const combinedLower = combined.toLowerCase();

    // Quick string-based success checks in either stream
    if (
      combinedLower.includes('"success": true') ||
      combinedLower.includes("license obtained") ||
      combinedLower.includes("already purchased") ||
      combinedLower.includes("already owned")
    ) {
      logger.log(`[ipatool] Purchase successful or already owned for ${displayName}`);
      if (!suppressHUD) {
        await showHUD(`Successfully purchased ${displayName}`);
      }
      return true;
    }

    // Parse line-delimited JSON emitted by ipatool in stdout/stderr
    try {
      const lines = combined
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("{") && l.endsWith("}"));

      for (const line of lines) {
        try {
          const obj = JSON.parse(line) as Record<string, unknown>;
          // success true anywhere indicates success
          if (obj && (obj["success"] === true || obj["message"] === "license obtained")) {
            logger.log(`[ipatool] Parsed JSON success during purchase for ${displayName}`);
            if (!suppressHUD) {
              await showHUD(`Successfully purchased ${displayName}`);
            }
            return true;
          }
          // Some versions report status text in "error" but success boolean separately
          if (obj && typeof obj["error"] === "string") {
            const err = String(obj["error"]).toLowerCase();
            if (err.includes("already purchased") || err.includes("already owned")) {
              logger.log(`[ipatool] Parsed JSON indicates already owned for ${displayName}`);
              return true;
            }
          }
        } catch (e) {
          // ignore bad lines
        }
      }
    } catch (e) {
      // ignore parse errors, fallback to analyzer below
    }

    // If we get here, the purchase might have failed
    logger.log(`[ipatool] Purchase may have failed for ${displayName}. Checking for errors...`);
    logger.log(`[ipatool] Purchase stdout: ${stdout}`);
    logger.log(`[ipatool] Purchase stderr: ${stderr}`);

    // Analyze any errors
    const errorAnalysis = analyzeIpatoolError(combined, stderr);

    if (errorAnalysis.isAuthError) {
      logger.error(`[ipatool] Authentication error during app purchase: ${errorAnalysis.userMessage}`);
      await handleAuthError(new Error(errorAnalysis.userMessage), false);
      return false;
    }

    // For non-auth errors, provide more specific error information
    logger.log(`[ipatool] Purchase failed for ${displayName}: ${errorAnalysis.userMessage}`);

    // Check for specific purchase failure reasons
    if (combinedLower.includes("not available") || combinedLower.includes("not found")) {
      logger.log(`[ipatool] App ${displayName} not available for purchase in this region`);
    }

    if (combinedLower.includes("requires payment") || combinedLower.includes("not free")) {
      logger.log(`[ipatool] App ${displayName} is not free and requires payment`);
    }

    return false;
  } catch (error) {
    logger.error(`[ipatool] Error during app purchase for ${appName || bundleId}:`, error);

    // Analyze the error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorAnalysis = analyzeIpatoolError(errorMessage, errorMessage);

    if (errorAnalysis.isAuthError) {
      await handleAuthError(error instanceof Error ? error : new Error(errorMessage), false);
    }

    return false;
  }
}

/**
 * Verifies the integrity of a downloaded iOS app file
 * @param filePath Path to the downloaded .ipa file
 * @param appName Optional app name for better error messages
 * @param ipatoolJson Optional ipatool JSON response containing metadata
 * @returns Promise<IntegrityResult> - integrity verification result
 */
export async function verifyFileIntegrity(
  filePath: string,
  appName?: string,
  ipatoolJson?: Record<string, string | number> | null,
): Promise<IntegrityResult> {
  const displayName = appName || path.basename(filePath);
  logger.log(`[integrity] Starting file integrity verification for ${displayName}`);

  try {
    // Basic: ensure file exists and size > 1 MB
    if (!fs.existsSync(filePath)) {
      const errorMsg = `Downloaded file not found: ${filePath}`;
      logger.error(`[integrity] File not found: ${filePath}`);
      return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
    }

    const stats = fs.statSync(filePath);
    if (stats.size < MIN_FILE_SIZE_BYTES) {
      const errorMsg = `Downloaded file too small: ${Math.round(stats.size / 1024)} KB (minimum: 1 MB)`;
      logger.error(`[integrity] File too small: ${filePath} (${stats.size} bytes)`);
      return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
    }

    logger.log(`[integrity] ✓ File exists and has valid size: ${Math.round(stats.size / BYTES_PER_MB)} MB`);

    // Structural: open as zip, check for Payload/*.app and Info.plist
    let zip: AdmZip;
    try {
      zip = new AdmZip(filePath);
    } catch (error) {
      const errorMsg = `Downloaded file is not a valid ZIP/IPA archive: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[integrity] Invalid ZIP structure: ${filePath}`);
      return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
    }

    const entries = zip.getEntries();
    if (entries.length === 0) {
      const errorMsg = `Downloaded IPA file is empty or corrupted`;
      logger.error(`[integrity] Empty ZIP archive: ${filePath}`);
      return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
    }

    // Check for Payload/*.app structure
    let foundPayloadApp = false;
    let foundInfoPlist = false;

    for (const entry of entries) {
      const entryName = entry.entryName;

      // Check for Payload/*.app pattern
      if (entryName.startsWith("Payload/") && entryName.includes(".app/") && !foundPayloadApp) {
        foundPayloadApp = true;
        logger.log(`[integrity] ✓ Found Payload app structure: ${entryName}`);
      }

      // Check for Info.plist
      if (entryName.includes("Info.plist") && !foundInfoPlist) {
        foundInfoPlist = true;
        logger.log(`[integrity] ✓ Found Info.plist: ${entryName}`);
      }

      // Exit early if we found both required components
      if (foundPayloadApp && foundInfoPlist) {
        break;
      }
    }

    if (!foundPayloadApp) {
      const errorMsg = `Downloaded IPA file missing required Payload/*.app structure`;
      logger.error(`[integrity] Missing Payload/*.app structure in: ${filePath}`);
      return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
    }

    if (!foundInfoPlist) {
      const errorMsg = `Downloaded IPA file missing required Info.plist`;
      logger.error(`[integrity] Missing Info.plist in: ${filePath}`);
      return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
    }

    logger.log(`[integrity] ✓ IPA file has valid structure with Payload/*.app and Info.plist`);

    // If ipatool JSON contains "fileSize" or "checksum", compare
    if (ipatoolJson) {
      if (ipatoolJson.fileSize && typeof ipatoolJson.fileSize === "number") {
        const expectedSize = ipatoolJson.fileSize;
        const sizeDifference = Math.abs(stats.size - expectedSize);
        const sizeTolerancePercent = 0.05; // 5% tolerance for size differences
        const sizeTolerance = expectedSize * sizeTolerancePercent;

        if (sizeDifference > sizeTolerance) {
          const errorMsg = `File size mismatch: expected ${Math.round(expectedSize / BYTES_PER_MB)} MB, got ${Math.round(stats.size / BYTES_PER_MB)} MB`;
          logger.error(`[integrity] File size mismatch: expected ${expectedSize}, got ${stats.size}`);
          return { isValid: false, errorMessage: errorMsg, shouldRetry: true };
        }

        logger.log(`[integrity] ✓ File size matches expected: ${Math.round(stats.size / BYTES_PER_MB)} MB`);
      }

      if (ipatoolJson.checksum && typeof ipatoolJson.checksum === "string") {
        // For checksum verification, we would need to implement the appropriate hash algorithm
        // This is a placeholder for future checksum verification implementation
        logger.log(`[integrity] Checksum verification available (${ipatoolJson.checksum}) but not implemented yet`);
      }
    }

    logger.log(`[integrity] ✓ File integrity verification completed successfully for ${displayName}`);
    return { isValid: true };
  } catch (error) {
    const errorMsg = `File integrity verification failed: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`[integrity] Verification error for ${filePath}:`, error);
    return { isValid: false, errorMessage: errorMsg, shouldRetry: false };
  }
}

/**
 * Search for iOS apps using ipatool
 * @param query Search query
 * @param limit Maximum number of results
 * @returns Array of app results
 */
export async function searchApps(query: string, limit = 20): Promise<IpaToolSearchApp[]> {
  try {
    logger.log(`[ipatool] Searching for apps with query: "${sanitizeQuery(query)}", limit: ${limit}`);

    // Ensure we're authenticated before proceeding
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      // Error already handled by ensureAuthenticated via handleAuthError
      return [];
    }

    // Execute the search command with proper formatting and non-interactive mode
    // Using execFile with array arguments to prevent command injection
    logger.log(`[ipatool] Executing search for query: ${sanitizeQuery(query)} with limit: ${limit}`);
    const { stdout } = await execFileAsync(IPATOOL_PATH, [
      "search",
      query,
      "-l",
      limit.toString(),
      "--format",
      "json",
      "--non-interactive",
    ]);

    // Parse the JSON output with fallback to empty response if parsing fails
    logger.log(`[ipatool] Received search response, parsing JSON...`);
    const searchResponse = safeJsonParse<IpaToolSearchResponse>(stdout, { count: 0, apps: [] });
    logger.log(`[ipatool] Found ${searchResponse.apps?.length || 0} apps in search results`);

    return searchResponse.apps || [];
  } catch (error) {
    logger.error("Error searching apps:", error);
    await handleAppSearchError(error instanceof Error ? error : new Error(String(error)), query, "searchApps");
    return [];
  }
}

/**
 * Download an app from the App Store using ipatool
 * @param bundleId Bundle identifier of the app to download
 * @param appName Optional app name for logging
 * @param appVersion Optional app version for logging
 * @param price Optional price for determining if app is paid
 * @param retryCount Current retry attempt (used for exponential backoff)
 * @param retryDelay Current retry delay in milliseconds
 * @returns Promise<string | null | undefined> - Path on success; null if user cancelled; undefined on failure
 */
export async function downloadApp(
  bundleId: string,
  appName = "",
  appVersion = "",
  price = "0",
  retryCount = 0,
  retryDelay = INITIAL_RETRY_DELAY,
  options?: { suppressHUD?: boolean },
): Promise<string | null | undefined> {
  try {
    logger.log(`[ipatool] Starting download for bundleId: ${bundleId}, app: ${appName}, version: ${appVersion}`);

    // Validate download prerequisites first (only on initial attempt, not retries)
    if (retryCount === 0) {
      logger.log(`[ipatool] Validating download prerequisites...`);

      // Try to get expected app size from iTunes API for better disk space validation
      let expectedSizeBytes: number | undefined;
      try {
        const itunesDetails = await fetchITunesAppDetails(bundleId);
        if (itunesDetails?.fileSizeBytes) {
          expectedSizeBytes = itunesDetails.fileSizeBytes;
          logger.log(
            `[validation] Got expected app size from iTunes API: ${Math.ceil(expectedSizeBytes / BYTES_PER_MB)} MB`,
          );
        }
      } catch (error) {
        logger.warn(`[validation] Could not fetch app size from iTunes API, using fallback:`, error);
      }

      const validation = await validateDownloadPrereqs(bundleId, appName, expectedSizeBytes, appVersion);
      if (!validation.isValid) {
        const msg = validation.errorMessage || "Prerequisite validation failed";
        if (validation.cancelled) {
          // Existing file; download skipped as a non-error outcome.
          logger.log(`[ipatool] Skipping download during validation: ${msg}`);
          return null;
        }
        logger.error(`[ipatool] Prerequisite validation failed: ${msg}`);
        throw new Error(msg);
      }
      logger.log(`[ipatool] ✓ Prerequisites validated successfully`);
    }

    // Ensure authenticated before download using centralized flow
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      return null;
    }

    // Get the downloads directory from preferences
    const downloadsDir = getDownloadsDirectory();

    // Show initial HUD with retry information if applicable
    const retryInfo = retryCount > 0 ? ` (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})` : "";
    const suppressHUD = options?.suppressHUD ?? false;
    if (!suppressHUD) {
      await showHUD(`Downloading ${appName || bundleId}${retryInfo}...`);
    }

    // Check if the app is paid based on price value
    const isPaidApp = price && parseFloat(price) > 0;
    logger.log(
      `[ipatool] Downloading app: ${appName || bundleId}, isPaidApp: ${isPaidApp}, price: ${price}${retryInfo}`,
    );

    // Use spawn instead of exec to get real-time output
    return new Promise<string | null | undefined>((resolve, reject) => {
      // Prepare the command and arguments
      const args = [
        "download",
        "-b",
        bundleId,
        "-o",
        downloadsDir,
        "--format",
        "json",
        "--non-interactive",
        "--verbose",
      ];

      // Add purchase flag for paid apps
      if (isPaidApp) {
        logger.log("Adding --purchase flag for paid app");
        args.push("--purchase");
      }

      logger.log(`[ipatool] Executing download command: ${IPATOOL_PATH} ${args.join(" ")}`);

      // Prepare a temp file path and register it
      const tempFilePath = path.join(downloadsDir, `${bundleId}.ipa.partial`);
      registerTempFile(tempFilePath);

      // Create secure spawn process with timeout management
      const { maxDownloadTimeout, maxStallTimeout } = getConfig();

      createSecureIpatoolProcess(args, {
        timeout: maxDownloadTimeout,
        allowedCommands: ["download"],
      })
        .then((child) => {
          let stdout = "";
          let stderr = "";
          let lastProgress = 0;
          let stallTimer: NodeJS.Timeout;

          const resetStallTimer = () => {
            if (stallTimer) clearTimeout(stallTimer);
            stallTimer = setTimeout(() => {
              logger.error(`[ipatool] Download stalled after ${maxStallTimeout / 1000} seconds without progress.`);
              child.kill();
              cleanupTempFilesByPattern(downloadsDir);
              reject(new Error("Download stalled."));
            }, maxStallTimeout);
          };

          resetStallTimer(); // Initialize stall timer

          // Collect stdout data
          if (child.stdout) {
            child.stdout.on("data", (data) => {
              const chunk = data.toString();
              stdout += chunk;
              logger.log(`[ipatool] stdout: ${chunk.trim()}`);

              // Log any authentication or purchase confirmation prompts for debugging
              if (chunk.includes("password") || chunk.includes("authentication") || chunk.includes("purchase")) {
                logger.log(`[ipatool] Authentication/Purchase prompt detected: ${chunk.trim()}`);
              }

              // Try to extract progress information
              const progressMatch = chunk.match(/downloading\s+(\d+)%/);
              if (progressMatch?.[1]) {
                const progress = parseInt(progressMatch[1], 10) / 100;
                if (progress > lastProgress) {
                  lastProgress = progress;
                  resetStallTimer(); // Reset stall timer on progress
                  if (!suppressHUD) {
                    showHUD(`Downloading ${appName || bundleId}... ${Math.round(progress * 100)}%`);
                  }
                }
              }
            });
          }

          // Clear stall timer on completion
          const clearAllTimers = () => {
            if (stallTimer) clearTimeout(stallTimer);
          };

          // Collect stderr data
          if (child.stderr) {
            child.stderr.on("data", (data) => {
              const chunk = data.toString();
              stderr += chunk;
              logger.error(`[ipatool] stderr: ${chunk.trim()}`);

              // Log specific error types for better debugging
              if (chunk.includes("network") || chunk.includes("connection") || chunk.includes("tls")) {
                logger.error(`[ipatool] Network-related error detected: ${chunk.trim()}`);
              } else if (chunk.includes("authentication") || chunk.includes("login")) {
                logger.error(`[ipatool] Authentication error detected: ${chunk.trim()}`);
              }
            });
          }

          // Handle process completion
          child.on("close", async (code) => {
            clearAllTimers();
            logger.log(`[ipatool] Download process exited with code ${code}`);

            // Only log full output in development or when there's an error
            if (process.env.NODE_ENV === "development" || code !== 0) {
              logger.log(`[ipatool] Full stdout: ${stdout}`);
              logger.log(`[ipatool] Full stderr: ${stderr}`);
            }

            if (code !== 0) {
              logger.error(`[ipatool] Download failed with code ${code}. Error: ${stderr}`);
              logger.error(`[ipatool] Full stdout content: "${stdout}"`);

              // Parse JSON output from stdout to get specific error information
              const errorMessage = `Process exited with code ${code}`;
              let specificError = "";

              try {
                // ipatool often outputs multiple JSON lines, check each line
                const lines = stdout
                  .trim()
                  .split("\n")
                  .filter((line) => line.trim());
                for (const line of lines) {
                  if (line.includes('"error"')) {
                    const jsonData = JSON.parse(line);
                    if (jsonData.error) {
                      specificError = jsonData.error;
                      logger.error(`[ipatool] Parsed error from JSON: ${specificError}`);
                      break;
                    }
                  }
                }
              } catch (parseError) {
                logger.error(`[ipatool] Could not parse JSON from stdout: ${parseError}`);
              }

              // Check if this is a network error that might be transient
              // Check both stderr and parsed error messages from stdout
              const isNetworkError =
                stderr.includes("TLS") ||
                stderr.includes("network") ||
                stderr.includes("connection") ||
                specificError.includes("tls") ||
                specificError.includes("network") ||
                specificError.includes("connection") ||
                specificError.includes("bad record MAC");

              if (isNetworkError && retryCount < MAX_RETRIES) {
                const nextRetryCount = retryCount + 1;
                const nextRetryDelay = Math.min(retryDelay * 1.5, MAX_RETRY_DELAY);

                logger.log(
                  `[ipatool] Network/TLS error detected: "${specificError}". Retrying in ${retryDelay}ms (attempt ${nextRetryCount}/${MAX_RETRIES})`,
                );
                if (!suppressHUD) {
                  await showHUD(`Network error. Retrying in ${Math.round(retryDelay / 1000)}s...`);
                }

                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return downloadApp(bundleId, appName, appVersion, price, nextRetryCount, nextRetryDelay, options);
              }

              // Use precise ipatool error analysis for categorization
              const fullErrorMessage = stderr || specificError || errorMessage;
              const errorAnalysis = analyzeIpatoolError(fullErrorMessage, stderr);

              // Check if this is a timeout/stall error that can be retried
              if (errorAnalysis.errorType === "timeout" && retryCount < MAX_RETRIES) {
                const nextRetryCount = retryCount + 1;
                const nextRetryDelay = Math.min(retryDelay * 1.5, MAX_RETRY_DELAY);

                logger.log(
                  `[ipatool] Timeout/stall error detected. Retrying in ${retryDelay}ms (attempt ${nextRetryCount}/${MAX_RETRIES})`,
                );
                if (!suppressHUD) {
                  await showHUD(`Download stalled – retry? Retrying in ${Math.round(retryDelay / 1000)}s...`);
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return downloadApp(bundleId, appName, appVersion, price, nextRetryCount, nextRetryDelay, options);
              }

              // Retry for rate limiting or maintenance downtime with extended backoff
              if (
                (errorAnalysis.errorType === "rate_limited" || errorAnalysis.errorType === "maintenance") &&
                retryCount < MAX_RETRIES
              ) {
                const nextRetryCount = retryCount + 1;
                const baseDelay = Math.max(retryDelay, 5000);
                const nextRetryDelay = Math.min(Math.floor(baseDelay * 1.5), 30000);

                logger.log(
                  `[ipatool] ${
                    errorAnalysis.errorType === "rate_limited" ? "Rate limited" : "App Store maintenance"
                  } detected. Retrying in ${Math.round(baseDelay / 1000)}s (attempt ${nextRetryCount}/${MAX_RETRIES})`,
                );
                if (!suppressHUD) {
                  await showHUD(
                    `${
                      errorAnalysis.errorType === "rate_limited" ? "Rate limited" : "Maintenance"
                    } – retrying in ${Math.round(baseDelay / 1000)}s...`,
                  );
                }

                await new Promise((resolve) => setTimeout(resolve, baseDelay));
                return downloadApp(bundleId, appName, appVersion, price, nextRetryCount, nextRetryDelay, options);
              }

              // Use the error analysis we already performed above
              // (errorAnalysis is already defined from the timeout check)

              // Use the analyzed error message and routing
              let finalErrorMessage = errorAnalysis.userMessage.includes(appName || bundleId)
                ? errorAnalysis.userMessage
                : errorAnalysis.userMessage.replace("App", `"${appName || bundleId}"`);

              // Check if this is a license required error for a free app
              if (errorAnalysis.isLicenseRequired && isFreeApp(price)) {
                logger.log(
                  `[ipatool] License required for free app ${appName || bundleId}. Attempting automatic purchase...`,
                );

                try {
                  const purchaseSuccess = await purchaseApp(bundleId, appName, options);

                  if (purchaseSuccess) {
                    logger.log(
                      `[ipatool] License purchase successful for ${appName || bundleId}. Retrying download...`,
                    );
                    if (!suppressHUD) {
                      await showHUD(`License obtained. Retrying download...`);
                    }

                    // Retry the download after successful license purchase
                    return downloadApp(bundleId, appName, appVersion, price, 0, INITIAL_RETRY_DELAY, options);
                  } else {
                    logger.log(
                      `[ipatool] License purchase failed for ${appName || bundleId}. Proceeding with error handling.`,
                    );
                    if (!suppressHUD) {
                      await showHUD(`Failed to obtain license for ${appName || bundleId}`);
                    }

                    // Update the error message to be more specific about license purchase failure
                    finalErrorMessage = `License purchase failed for free app "${appName || bundleId}". This may be due to authentication issues or App Store restrictions.`;
                  }
                } catch (purchaseError) {
                  logger.error(`[ipatool] Error during license purchase attempt:`, purchaseError);
                  if (!suppressHUD) {
                    await showHUD(`License purchase error for ${appName || bundleId}`);
                  }

                  // Update the error message to include the purchase error details
                  const purchaseErrorMsg =
                    purchaseError instanceof Error ? purchaseError.message : String(purchaseError);
                  finalErrorMessage = `License purchase failed for free app "${appName || bundleId}": ${purchaseErrorMsg}`;
                }
              }

              // Route to appropriate error handler based on analysis
              if (errorAnalysis.isAuthError) {
                // Import the error types if not already imported at the top
                const { NeedsLoginError } = await import("./utils/auth");
                // Reject with NeedsLoginError to let the hook handle it with navigation
                reject(new NeedsLoginError(finalErrorMessage));
              } else {
                await handleDownloadError(new Error(finalErrorMessage), "download app", "downloadApp");
                reject(new Error(errorMessage));
              }
              return;
            }

            // Show complete HUD
            if (!suppressHUD) {
              await showHUD("Download complete");
            }

            // Try to find a JSON object in the output
            let filePath = "";

            // Look for JSON object in the output
            const lines = stdout.trim().split("\n");
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i].trim();
              if (line.startsWith("{") && line.endsWith("}")) {
                try {
                  const jsonOutput = safeJsonParse<{ output: string }>(line, { output: "" });
                  if (jsonOutput.output) {
                    filePath = jsonOutput.output;
                    logger.log(`[ipatool] Found file path in JSON output: ${filePath}`);
                    break;
                  }
                } catch (e) {
                  logger.error("Error parsing JSON line:", e);
                  // Continue to next line if this one fails
                }
              }
            }

            // If no filePath found in JSON, try to extract it from the stdout
            if (!filePath) {
              logger.log(
                "[ipatool] No JSON output found, trying to extract file path from stdout using regex patterns",
              );
              filePath = extractFilePath(stdout, "");

              // If still no file path, try a fallback approach
              if (!filePath) {
                // Try to find the file in the downloads directory with the bundle ID
                const defaultPath = path.join(downloadsDir, `${bundleId}.ipa`);
                if (fs.existsSync(defaultPath)) {
                  filePath = defaultPath;
                  logger.log(`[ipatool] Using default file path based on bundleId: ${filePath}`);
                } else {
                  // Try to find any recently created .ipa file in the downloads directory
                  try {
                    const files = fs
                      .readdirSync(downloadsDir)
                      .filter((file) => file.endsWith(".ipa") && file.includes(bundleId))
                      .map((file) => ({
                        name: file,
                        path: path.join(downloadsDir, file),
                        mtime: fs.statSync(path.join(downloadsDir, file)).mtime,
                      }))
                      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

                    if (files.length > 0) {
                      filePath = files[0].path;
                      logger.log(`[ipatool] Found most recent .ipa file in downloads directory: ${filePath}`);
                    }
                  } catch (e) {
                    logger.error("Error finding .ipa files:", e);
                  }
                }
              }
            }

            logger.log(`[ipatool] Original downloaded file path: ${filePath}`);

            // Verify file integrity before renaming
            if (filePath && fs.existsSync(filePath)) {
              logger.log(`[ipatool] Starting file integrity verification for ${appName || bundleId}`);

              // Parse any JSON metadata from stdout for integrity verification
              let ipatoolJsonData = null;
              try {
                const lines = stdout.trim().split("\n");
                for (const line of lines) {
                  if (line.trim().startsWith("{") && line.trim().endsWith("}")) {
                    const parsedJson = JSON.parse(line);
                    if (parsedJson && (parsedJson.fileSize || parsedJson.checksum)) {
                      ipatoolJsonData = parsedJson;
                      logger.log(`[ipatool] Found metadata for integrity check:`, ipatoolJsonData);
                      break;
                    }
                  }
                }
              } catch (parseError) {
                logger.log(`[ipatool] No valid JSON metadata found for integrity verification`);
              }

              const integrityResult = await verifyFileIntegrity(filePath, appName, ipatoolJsonData);

              if (!integrityResult.isValid) {
                logger.error(`[ipatool] File integrity verification failed: ${integrityResult.errorMessage}`);

                // Cleanup corrupted file
                try {
                  fs.unlinkSync(filePath);
                  logger.log(`[ipatool] Cleaned up corrupted file: ${filePath}`);
                } catch (cleanupError) {
                  logger.error(`[ipatool] Error cleaning up corrupted file:`, cleanupError);
                }

                // Handle corrupted file error
                await handleDownloadError(
                  new Error(`Downloaded file is corrupted: ${integrityResult.errorMessage}`),
                  "verify downloaded file",
                  "downloadApp",
                );

                // Optional automatic retry (once) for corrupted files
                if (integrityResult.shouldRetry && retryCount === 0) {
                  logger.log(`[ipatool] Attempting automatic retry for corrupted file`);
                  if (!suppressHUD) {
                    await showHUD(`File corrupted. Retrying download...`);
                  }

                  // Wait a short delay before retry
                  await new Promise((resolve) => setTimeout(resolve, 2000));

                  // Retry with retryCount = 1 to prevent infinite retry loop
                  return downloadApp(bundleId, appName, appVersion, price, 1, INITIAL_RETRY_DELAY, options);
                }

                reject(new Error(`File integrity verification failed: ${integrityResult.errorMessage}`));
                return;
              }

              logger.log(`[ipatool] ✓ File integrity verification passed for ${appName || bundleId}`);
            }

            // Rename the file if we have app name and version and the file exists
            if (filePath && fs.existsSync(filePath) && appName && appVersion) {
              const directory = path.dirname(filePath);
              // Replace invalid filename characters with a dash
              const sanitizedAppName = appName.replace(/[/\\?%*:|"<>]/g, "-");
              const newFileName = `${sanitizedAppName} ${appVersion}.ipa`;
              const newFilePath = path.join(directory, newFileName);

              logger.log(`[ipatool] Attempting to rename file to: ${newFilePath}`);

              try {
                fs.renameSync(filePath, newFilePath);
                logger.log(`[ipatool] Successfully renamed file to: ${newFilePath}`);
                logger.log(`[ipatool] Download and rename complete for ${appName} v${appVersion}`);
                filePath = newFilePath;
              } catch (e) {
                logger.error("Error renaming file:", e);
                // Continue with the original file path if rename fails
              }
            }

            resolve(filePath);
          });

          // Handle process errors
          child.on("error", async (error) => {
            clearAllTimers();
            logger.error(`[ipatool] Process error during download: ${error.message}`);

            // Check if this is a TLS error or other network error that might be transient
            const isTlsError =
              error.message.includes("tls: bad record MAC") ||
              error.message.includes("network error") ||
              error.message.includes("connection reset");

            // If we have retries left and it's a TLS error, retry with backoff
            if (isTlsError && retryCount < MAX_RETRIES) {
              const nextRetryCount = retryCount + 1;
              const nextRetryDelay = retryDelay * 1.5; // Exponential backoff

              logger.log(
                `[ipatool] TLS/Network error detected in process error handler. Retrying in ${retryDelay}ms (Attempt ${nextRetryCount}/${MAX_RETRIES})`,
              );
              if (!suppressHUD) {
                await showHUD(`Network error. Retrying in ${Math.round(retryDelay / 1000)}s...`);
              }
              logger.log(`[ipatool] Waiting ${retryDelay}ms before retry attempt ${nextRetryCount}/${MAX_RETRIES}`);

              // Wait for the retry delay
              setTimeout(async () => {
                try {
                  // Retry the download
                  const result = await downloadApp(
                    bundleId,
                    appName,
                    appVersion,
                    price,
                    nextRetryCount,
                    nextRetryDelay,
                    options,
                  );
                  resolve(result);
                } catch (retryError) {
                  reject(retryError);
                }
              }, retryDelay);
              return;
            }

            // If we're out of retries or it's not a TLS error, fail normally
            handleProcessErrorCleanup(error, "downloadApp");
            if (!suppressHUD) {
              await showHUD("Download failed");
            }
            await handleDownloadError(error, "download app", "downloadApp");
            reject(error);
          });
        })
        .catch((processError) => {
          logger.error(`[ipatool] Failed to create secure process:`, processError);
          cleanupTempFilesByPattern(downloadsDir);
          reject(processError);
        });
    });
  } catch (error) {
    // Import the error types if not already imported
    const { NeedsLoginError, Needs2FAError } = await import("./utils/auth");

    // Let authentication errors bubble up to be handled by the calling code
    if (error instanceof NeedsLoginError || error instanceof Needs2FAError) {
      logger.error(`[ipatool] Authentication error during download: ${error.message}`);
      throw error; // Re-throw to let the hook handle it with navigation
    }

    logger.error(`[ipatool] Unhandled download error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logger.error(`[ipatool] Error stack: ${error.stack}`);
    }
    logger.error(`[ipatool] Error details:`, error);
    // Re-throw to let callers handle HUD/toasts consistently and avoid duplicates
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Get detailed information about an app
 * @param bundleId Bundle ID of the app
 * @returns App details object
 */
export async function getAppDetails(bundleId: string) {
  try {
    logger.log(`[ipatool] Getting app details for bundleId: ${bundleId}`);

    // Ensure we're authenticated before proceeding
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      await handleAuthError(
        new Error("Authentication failed during app details lookup. Please check your Apple ID credentials."),
        false,
      );
      return null;
    }

    // Try to get details directly from iTunes API first
    logger.log(`[ipatool] Trying to fetch details directly from iTunes API for ${bundleId}`);
    const itunesDetails = await fetchITunesAppDetails(bundleId);

    if (itunesDetails) {
      logger.log(`[ipatool] Successfully retrieved details from iTunes API for ${bundleId}`);

      // Use the utility function to convert iTunes data to AppDetails
      const result = convertITunesResultToAppDetails(itunesDetails);

      logger.log(`[ipatool] Successfully parsed app details from iTunes API for ${bundleId}`);
      return result;
    }

    // If iTunes API fails, fall back to ipatool search
    logger.log(`[ipatool] iTunes API lookup failed, falling back to ipatool search for ${bundleId}`);

    // Try a more general search if the bundle ID is very specific
    // This helps with cases where the exact bundle ID doesn't yield results
    let searchTerm = bundleId;
    // Ensure bundleId is defined before trying to split it
    if (bundleId && bundleId.split(".").length > 2) {
      // Extract the app name part from the bundle ID (usually the last part)
      const bundleParts = bundleId.split(".");
      const possibleAppName = bundleParts[bundleParts.length - 1];
      if (possibleAppName && possibleAppName.length > 3) {
        searchTerm = possibleAppName;
        logger.log(`[ipatool] Using extracted app name from bundle ID: ${searchTerm}`);
      }
    }

    // Execute the search command using execFile to prevent command injection
    logger.log(`[ipatool] Executing search for term: ${searchTerm}`);
    const { stdout } = await execFileAsync(IPATOOL_PATH, [
      "search",
      searchTerm,
      "-l",
      "20",
      "--format",
      "json",
      "--non-interactive",
    ]);

    // Parse the JSON output with fallback to null if parsing fails
    logger.log(`[ipatool] Received search response, parsing JSON...`);
    const searchResponse = safeJsonParse<IpaToolSearchResponse>(stdout, { count: 0, apps: [] });

    if (!searchResponse.apps || searchResponse.apps.length === 0) {
      logger.log(`[ipatool] No apps found for search term: ${searchTerm}`);
      return null;
    }

    // Find the exact bundle ID match in the search results
    const exactMatch = searchResponse.apps.find((app) => (app.bundleId || app.bundleID) === bundleId);

    // If no exact match is found, use the first result as a fallback
    const app = exactMatch || searchResponse.apps[0];
    logger.log(
      `[ipatool] ${exactMatch ? "Found exact match" : "No exact match found, using first result"}: ${app.name} (${app.bundleId})`,
    );

    // Create a basic result with the data we have from ipatool search
    let result: AppDetails = {
      id: app.id.toString(),
      name: app.name,
      version: app.version,
      bundleId: app.bundleId || app.bundleID || "", // Handle both bundleId and bundleID formats
      artworkUrl60: "",
      description: "",
      iconUrl: "",
      sellerName: app.developer,
      price: app.price.toString(),
      currency: "USD", // Default currency for ipatool results
      genres: [],
      size: "0",
      contentRating: "",
      artistName: "",
      artworkUrl512: "",
      averageUserRating: 0,
      averageUserRatingForCurrentVersion: 0,
      userRatingCount: 0,
      userRatingCountForCurrentVersion: 0,
      releaseDate: "",
    };

    // Try to fetch additional details from iTunes API for the app we found
    const appBundleId = app.bundleId || app.bundleID || "";
    if (appBundleId !== bundleId && appBundleId) {
      logger.log(`[ipatool] Trying to fetch iTunes data for found app: ${appBundleId}`);
      const appItunesDetails = await fetchITunesAppDetails(appBundleId);

      if (appItunesDetails) {
        logger.log(`[ipatool] Enriching app details with iTunes data for ${app.bundleId}`);

        // Use the utility function to convert iTunes data to AppDetails
        result = convertITunesResultToAppDetails(appItunesDetails, result);
      } else {
        logger.log(`[ipatool] Could not fetch iTunes data for ${app.bundleId}, using basic details only`);
      }
    }

    logger.log(`[ipatool] Successfully parsed app details for ${bundleId}`);
    return result;
  } catch (error) {
    logger.error(
      `[ipatool] Error getting app details for ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      logger.error(`[ipatool] Error stack: ${error.stack}`);
    }
    logger.error(`[ipatool] Error details:`, error);
    await handleAppSearchError(error instanceof Error ? error : new Error(String(error)), bundleId, "getAppDetails");
    return null;
  }
}
