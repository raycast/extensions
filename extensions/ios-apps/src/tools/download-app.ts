import { downloadIPA, searchApps } from "../ipatool";
import path from "path";

// No initial confirmation - we'll confirm only during the actual download process

type Input = {
  /**
   * The name or search term for the iOS app
   */
  query: string;
};

/**
 * Download an iOS app by name or bundle ID
 */
export default async function downloadIosApp(input: Input) {
  console.log(`[download-app tool] Starting download for app: "${input.query}"`);

  try {
    let bundleId = "";
    let appName = "";
    let appVersion = "";
    let price = "0";

    // Search for the app by name
    console.log(`[download-app tool] Searching for app: "${input.query}"`);
    const searchResults = await searchApps(input.query, 1);

    if (searchResults.length === 0) {
      throw new Error(`No apps found matching "${input.query}"`);
    }

    const app = searchResults[0];
    bundleId = app.bundleId;
    appName = app.name;
    appVersion = app.version;
    price = app.price.toString();
    console.log(`[download-app tool] Found app: ${appName} (${bundleId}) version ${appVersion}`);

    // Download the app
    console.log(`[download-app tool] Starting download for ${appName} (${bundleId})`);
    const filePath = await downloadIPA(bundleId, appName, appVersion, price);

    if (!filePath) {
      throw new Error(`Failed to download app "${appName}"`);
    }

    console.log(`[download-app tool] Successfully downloaded app to: ${filePath}`);

    // Return the result
    return {
      filePath,
      fileName: path.basename(filePath),
      appName,
      bundleId,
      version: appVersion,
    };
  } catch (error) {
    console.error(`[download-app tool] Error:`, error);
    throw new Error(`Failed to download app${error instanceof Error ? `: ${error.message}` : ""}`, { cause: error });
  }
}
