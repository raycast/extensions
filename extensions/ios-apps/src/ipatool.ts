import { promisify } from "util";
import { showToast, Toast, showHUD } from "@raycast/api";
import { IPATOOL_PATH, getDownloadsDirectory } from "./utils/paths";
import { ensureAuthenticated, safeJsonParse, extractFilePath } from "./utils/common";
import { fetchITunesAppDetails, convertITunesResultToAppDetails } from "./utils/itunes-api";
import path from "path";
import fs from "fs";
import { exec, spawn } from "child_process";
import { AppDetails, IpaToolSearchApp, IpaToolSearchResponse } from "./types";

// Retry configuration for handling transient network errors
const MAX_RETRIES = 3; // Maximum number of retry attempts
const INITIAL_RETRY_DELAY = 2000; // Initial delay between retries (2 seconds)

const execAsync = promisify(exec);

/**
 * Search for iOS apps using ipatool
 * @param query Search query
 * @param limit Maximum number of results
 * @returns Array of app results
 */
export async function searchApps(query: string, limit = 20): Promise<IpaToolSearchApp[]> {
  try {
    console.log(`[ipatool] Searching for apps with query: "${query}", limit: ${limit}`);

    // Ensure we're authenticated before proceeding
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      console.error("[ipatool] Authentication failed during app search");
      showToast(Toast.Style.Failure, "Authentication failed", "Please check your Apple ID credentials");
      return [];
    }

    // Execute the search command with proper formatting and non-interactive mode
    const searchCommand = `${IPATOOL_PATH} search "${query}" -l ${limit} --format json --non-interactive`;
    console.log(`[ipatool] Executing search command: ${searchCommand}`);
    const { stdout } = await execAsync(searchCommand);

    // Parse the JSON output with fallback to empty response if parsing fails
    console.log(`[ipatool] Received search response, parsing JSON...`);
    const searchResponse = safeJsonParse<IpaToolSearchResponse>(stdout, { count: 0, apps: [] });
    console.log(`[ipatool] Found ${searchResponse.apps?.length || 0} apps in search results`);

    return searchResponse.apps || [];
  } catch (error) {
    console.error("Error searching apps:", error);
    showToast(Toast.Style.Failure, "Error searching apps", String(error));
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
    console.log(`[ipatool] Starting download for bundleId: ${bundleId}, app: ${appName}, version: ${appVersion}`);

    // Ensure we're authenticated before proceeding with download
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      console.error("[ipatool] Authentication failed during app download");
      showToast(Toast.Style.Failure, "Authentication failed", "Please check your Apple ID credentials");
      return null;
    }

    // Get the downloads directory from preferences
    const downloadsDir = getDownloadsDirectory();

    // Show initial HUD with retry information if applicable
    const retryInfo = retryCount > 0 ? ` (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})` : "";
    await showHUD(`Downloading ${appName || bundleId}${retryInfo}...`, { clearRootSearch: true });

    // Check if the app is paid based on price value
    const isPaid = price !== "0" && price !== "";
    console.log(`[ipatool] Downloading app: ${appName || bundleId}, isPaid: ${isPaid}, price: ${price}${retryInfo}`);

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
        console.log("Adding --purchase flag for paid app");
        args.push("--purchase");
      }

      console.log(`[ipatool] Executing download command: ${IPATOOL_PATH} ${args.join(" ")}`);

      // Spawn the process
      const child = spawn(IPATOOL_PATH, args);

      let stdout = "";
      let stderr = "";
      let lastProgress = 0;

      // Collect stdout data
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[ipatool] stdout: ${chunk.trim()}`);

        // Log any authentication or purchase confirmation prompts for debugging
        if (chunk.includes("password") || chunk.includes("authentication") || chunk.includes("purchase")) {
          console.log(`[ipatool] Authentication/Purchase prompt detected: ${chunk.trim()}`);
        }

        // Try to extract progress information
        const progressMatch = chunk.match(/downloading\s+(\d+)%/);
        if (progressMatch && progressMatch[1]) {
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
        console.error(`[ipatool] stderr: ${chunk.trim()}`);

        // Log specific error types for better debugging
        if (chunk.includes("network") || chunk.includes("connection") || chunk.includes("tls")) {
          console.error(`[ipatool] Network-related error detected: ${chunk.trim()}`);
        } else if (chunk.includes("authentication") || chunk.includes("login")) {
          console.error(`[ipatool] Authentication error detected: ${chunk.trim()}`);
        }
      });

      // Handle process completion
      child.on("close", async (code) => {
        console.log(`[ipatool] Download process exited with code ${code}`);

        // Only log full output in development or when there's an error
        if (process.env.NODE_ENV === "development" || code !== 0) {
          console.log(`[ipatool] Full stdout: ${stdout}`);
          console.log(`[ipatool] Full stderr: ${stderr}`);
        }

        if (code !== 0) {
          console.error(`[ipatool] Download failed with code ${code}. Error: ${stderr}`);

          // Log specific error information for troubleshooting
          if (stderr.includes("not found") || stderr.includes("no app")) {
            console.error(`[ipatool] App not found error detected for bundleId: ${bundleId}`);
          } else if (stderr.includes("permission") || stderr.includes("access")) {
            console.error(`[ipatool] Permission error detected, check file system permissions`);
          }

          // Check if this is a TLS error or other network error that might be transient
          const isTlsError =
            stdout.includes("tls: bad record MAC") ||
            stderr.includes("tls: bad record MAC") ||
            stdout.includes("network error") ||
            stderr.includes("network error") ||
            stdout.includes("connection reset") ||
            stderr.includes("connection reset");

          // If we have retries left and it's a TLS error, retry with backoff
          if (isTlsError && retryCount < MAX_RETRIES) {
            const nextRetryCount = retryCount + 1;
            const nextRetryDelay = retryDelay * 1.5; // Exponential backoff

            console.log(
              `[ipatool] TLS/Network error detected. Retrying in ${retryDelay}ms (Attempt ${nextRetryCount}/${MAX_RETRIES})`,
            );
            await showHUD(`Network error. Retrying in ${Math.round(retryDelay / 1000)}s...`, { clearRootSearch: true });
            console.log(`[ipatool] Waiting ${retryDelay}ms before retry attempt ${nextRetryCount}/${MAX_RETRIES}`);

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
          showToast(Toast.Style.Failure, "Download Failed", `Process exited with code ${code}`);
          reject(new Error(`Process exited with code ${code}`));
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
                console.log(`[ipatool] Found file path in JSON output: ${filePath}`);
                break;
              }
            } catch (e) {
              console.error("Error parsing JSON line:", e);
              // Continue to next line if this one fails
            }
          }
        }

        // If no filePath found in JSON, try to extract it from the stdout
        if (!filePath) {
          console.log("[ipatool] No JSON output found, trying to extract file path from stdout using regex patterns");
          filePath = extractFilePath(stdout, "");

          // If still no file path, try a fallback approach
          if (!filePath) {
            // Try to find the file in the downloads directory with the bundle ID
            const defaultPath = path.join(downloadsDir, `${bundleId}.ipa`);
            if (fs.existsSync(defaultPath)) {
              filePath = defaultPath;
              console.log(`[ipatool] Using default file path based on bundleId: ${filePath}`);
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
                  console.log(`[ipatool] Found most recent .ipa file in downloads directory: ${filePath}`);
                }
              } catch (e) {
                console.error("Error finding .ipa files:", e);
              }
            }
          }
        }

        console.log(`[ipatool] Original downloaded file path: ${filePath}`);

        // Rename the file if we have app name and version and the file exists
        if (filePath && fs.existsSync(filePath) && appName && appVersion) {
          const directory = path.dirname(filePath);
          // Replace invalid filename characters with a dash
          const sanitizedAppName = appName.replace(/[/\\?%*:|"<>]/g, "-");
          const newFileName = `${sanitizedAppName} ${appVersion}.ipa`;
          const newFilePath = path.join(directory, newFileName);

          console.log(`[ipatool] Attempting to rename file to: ${newFilePath}`);

          try {
            fs.renameSync(filePath, newFilePath);
            console.log(`[ipatool] Successfully renamed file to: ${newFilePath}`);
            console.log(`[ipatool] Download and rename complete for ${appName} v${appVersion}`);
            filePath = newFilePath;
          } catch (e) {
            console.error("Error renaming file:", e);
            // Continue with the original file path if rename fails
          }
        }

        resolve(filePath);
      });

      // Handle process errors
      child.on("error", async (error) => {
        console.error(`[ipatool] Process error during download: ${error.message}`);

        // Check if this is a TLS error or other network error that might be transient
        const isTlsError =
          error.message.includes("tls: bad record MAC") ||
          error.message.includes("network error") ||
          error.message.includes("connection reset");

        // If we have retries left and it's a TLS error, retry with backoff
        if (isTlsError && retryCount < MAX_RETRIES) {
          const nextRetryCount = retryCount + 1;
          const nextRetryDelay = retryDelay * 1.5; // Exponential backoff

          console.log(
            `[ipatool] TLS/Network error detected in process error handler. Retrying in ${retryDelay}ms (Attempt ${nextRetryCount}/${MAX_RETRIES})`,
          );
          await showHUD(`Network error. Retrying in ${Math.round(retryDelay / 1000)}s...`, { clearRootSearch: true });
          console.log(`[ipatool] Waiting ${retryDelay}ms before retry attempt ${nextRetryCount}/${MAX_RETRIES}`);

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
        showToast(Toast.Style.Failure, "Download Failed", error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`[ipatool] Unhandled download error: ${error}`);
    console.error(`[ipatool] Error stack: ${(error as Error).stack || "No stack trace available"}`);
    await showHUD("Download failed", { clearRootSearch: true });
    showToast(Toast.Style.Failure, "Download Failed", String(error));
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
    console.log(`[ipatool] Getting app details for bundleId: ${bundleId}`);

    // Ensure we're authenticated before proceeding
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      console.error("[ipatool] Authentication failed during app details lookup");
      showToast(Toast.Style.Failure, "Authentication failed", "Please check your Apple ID credentials");
      return null;
    }

    // Try to get details directly from iTunes API first
    console.log(`[ipatool] Trying to fetch details directly from iTunes API for ${bundleId}`);
    const itunesDetails = await fetchITunesAppDetails(bundleId);

    if (itunesDetails) {
      console.log(`[ipatool] Successfully retrieved details from iTunes API for ${bundleId}`);

      // Use the utility function to convert iTunes data to AppDetails
      const result = convertITunesResultToAppDetails(itunesDetails);

      console.log(`[ipatool] Successfully parsed app details from iTunes API for ${bundleId}`);
      return result;
    }

    // If iTunes API fails, fall back to ipatool search
    console.log(`[ipatool] iTunes API lookup failed, falling back to ipatool search for ${bundleId}`);

    // Try a more general search if the bundle ID is very specific
    // This helps with cases where the exact bundle ID doesn't yield results
    let searchTerm = bundleId;
    if (bundleId.split(".").length > 2) {
      // Extract the app name part from the bundle ID (usually the last part)
      const bundleParts = bundleId.split(".");
      const possibleAppName = bundleParts[bundleParts.length - 1];
      if (possibleAppName && possibleAppName.length > 3) {
        searchTerm = possibleAppName;
        console.log(`[ipatool] Using extracted app name from bundle ID: ${searchTerm}`);
      }
    }

    // Execute the search command
    const searchCommand = `${IPATOOL_PATH} search "${searchTerm}" -l 20 --format json --non-interactive`;
    console.log(`[ipatool] Executing search command: ${searchCommand}`);
    const { stdout } = await execAsync(searchCommand);

    // Parse the JSON output with fallback to null if parsing fails
    console.log(`[ipatool] Received search response, parsing JSON...`);
    const searchResponse = safeJsonParse<IpaToolSearchResponse>(stdout, { count: 0, apps: [] });

    if (!searchResponse.apps || searchResponse.apps.length === 0) {
      console.log(`[ipatool] No apps found for search term: ${searchTerm}`);
      return null;
    }

    // Find the exact bundle ID match in the search results
    const exactMatch = searchResponse.apps.find((app) => app.bundleID === bundleId);

    // If no exact match is found, use the first result as a fallback
    const app = exactMatch || searchResponse.apps[0];
    console.log(
      `[ipatool] ${exactMatch ? "Found exact match" : "No exact match found, using first result"}: ${app.name} (${app.bundleID})`,
    );

    // Create a basic result with the data we have from ipatool search
    let result: AppDetails = {
      id: app.id.toString(),
      name: app.name,
      version: app.version,
      bundleId: app.bundleID,
      artworkUrl60: undefined,
      description: "",
      iconUrl: "",
      sellerName: app.developer,
      price: app.price.toString(),
      genres: [],
      size: "0",
      contentRating: "",
    };

    // Try to fetch additional details from iTunes API for the app we found
    if (app.bundleID !== bundleId) {
      console.log(`[ipatool] Trying to fetch iTunes data for found app: ${app.bundleID}`);
      const appItunesDetails = await fetchITunesAppDetails(app.bundleID);

      if (appItunesDetails) {
        console.log(`[ipatool] Enriching app details with iTunes data for ${app.bundleID}`);

        // Use the utility function to convert iTunes data to AppDetails
        result = convertITunesResultToAppDetails(appItunesDetails, result);
      } else {
        console.log(`[ipatool] Could not fetch iTunes data for ${app.bundleID}, using basic details only`);
      }
    }

    console.log(`[ipatool] Successfully parsed app details for ${bundleId}`);
    return result;
  } catch (error) {
    console.error(`[ipatool] Error getting app details for ${bundleId}: ${error}`);
    console.error(`[ipatool] Error stack: ${(error as Error).stack || "No stack trace available"}`);
    showToast(Toast.Style.Failure, "Error getting app details", String(error));
    return null;
  }
}
