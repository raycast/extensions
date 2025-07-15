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
import { showHUD } from "@raycast/api";
import { analyzeIpatoolError } from "./utils/ipatool-error-patterns";

// Retry configuration for handling transient network errors
const MAX_RETRIES = 3; // Maximum number of retry attempts
const INITIAL_RETRY_DELAY = 2000; // Initial delay between retries (2 seconds)
const MAX_RETRY_DELAY = 10000; // Maximum delay between retries (10 seconds)

const execFileAsync = promisify(execFile);

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
 * Download an iOS app using ipatool
 * @param bundleId Bundle ID of the app to download
 * @param appName App name for file renaming
 * @param appVersion App version for file renaming
 * @param price App price to determine if it's paid (optional)
 * @param retryCount Current retry attempt (used internally)
 * @param retryDelay Delay before retry in ms (used internally)
 * @returns Path to the downloaded file
 */
export async function downloadIPA(
  bundleId: string,
  appName = "",
  appVersion = "",
  price = "0",
  retryCount = 0,
  retryDelay = INITIAL_RETRY_DELAY,
) {
  try {
    logger.log(`[ipatool] Starting download for bundleId: ${bundleId}, app: ${appName}, version: ${appVersion}`);

    // Ensure we're authenticated before proceeding with download
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      // Error already handled by ensureAuthenticated via handleAuthError
      return null;
    }

    // Get the downloads directory from preferences
    const downloadsDir = getDownloadsDirectory();

    // Show initial HUD with retry information if applicable
    const retryInfo = retryCount > 0 ? ` (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})` : "";
    await showHUD(`Downloading ${appName || bundleId}${retryInfo}...`, { clearRootSearch: true });

    // Check if the app is paid based on price value
    const isPaid = price && parseFloat(price) > 0;
    logger.log(`[ipatool] Downloading app: ${appName || bundleId}, isPaid: ${isPaid}, price: ${price}${retryInfo}`);

    // Use spawn instead of exec to get real-time output
    return new Promise<string | null>((resolve, reject) => {
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
      if (isPaid) {
        logger.log("Adding --purchase flag for paid app");
        args.push("--purchase");
      }

      logger.log(`[ipatool] Executing download command: ${IPATOOL_PATH} ${args.join(" ")}`);

      // Spawn the process
      const child = spawn(IPATOOL_PATH, args);

      let stdout = "";
      let stderr = "";
      let lastProgress = 0;

      // Collect stdout data
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
            showHUD(`Downloading ${appName || bundleId}... ${Math.round(progress * 100)}%`, { clearRootSearch: true });
          }
        }
      });

      // Collect stderr data
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

      // Handle process completion
      child.on("close", async (code) => {
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
            await showHUD(`Network error. Retrying in ${Math.round(retryDelay / 1000)}s...`, { clearRootSearch: true });

            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return downloadIPA(bundleId, appName, appVersion, price, nextRetryCount, nextRetryDelay);
          }

          // Use precise ipatool error analysis instead of manual pattern matching
          const fullErrorMessage = `${errorMessage} ${specificError} ${stderr}`.trim();
          const errorAnalysis = analyzeIpatoolError(fullErrorMessage, stderr);

          // Use the analyzed error message and routing
          const finalErrorMessage = errorAnalysis.userMessage.includes(appName || bundleId)
            ? errorAnalysis.userMessage
            : errorAnalysis.userMessage.replace("App", `"${appName || bundleId}"`);

          // Route to appropriate error handler based on analysis
          if (errorAnalysis.isAuthError) {
            await handleAuthError(new Error(finalErrorMessage), false);
          } else {
            await handleDownloadError(new Error(finalErrorMessage), "download app", "downloadIPA");
          }
          reject(new Error(errorMessage));
          return;
        }

        // Show complete HUD
        await showHUD("Download complete", { clearRootSearch: true });

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
          logger.log("[ipatool] No JSON output found, trying to extract file path from stdout using regex patterns");
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
          await showHUD(`Network error. Retrying in ${Math.round(retryDelay / 1000)}s...`, { clearRootSearch: true });
          logger.log(`[ipatool] Waiting ${retryDelay}ms before retry attempt ${nextRetryCount}/${MAX_RETRIES}`);

          // Wait for the retry delay
          setTimeout(async () => {
            try {
              // Retry the download
              const result = await downloadIPA(bundleId, appName, appVersion, price, nextRetryCount, nextRetryDelay);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, retryDelay);
          return;
        }

        // If we're out of retries or it's not a TLS error, fail normally
        await showHUD("Download failed", { clearRootSearch: true });
        await handleDownloadError(error, "download app", "downloadIPA");
        reject(error);
      });
    });
  } catch (error) {
    logger.error(`[ipatool] Unhandled download error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logger.error(`[ipatool] Error stack: ${error.stack}`);
    }
    logger.error(`[ipatool] Error details:`, error);
    await showHUD("Download failed", { clearRootSearch: true });
    await handleDownloadError(error instanceof Error ? error : new Error(String(error)), "download app", "downloadIPA");
    return null;
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
