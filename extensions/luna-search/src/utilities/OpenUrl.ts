import { Application, getApplications, open } from "@raycast/api";

/**
 * The bundle ID for the Google Chrome browser.
 */
const CHROME_BUNDLE_ID = "com.google.Chrome";

/**
 * The bundle ID for the Microsoft Edge browser.
 */
const EDGE_BUNDLE_ID = "com.microsoft.Edge";

/**
 * A set of bundle IDs for the browsers that are compatible with gameplay on Luna.
 */
const LUNA_COMPATIBLE_BUNDLES = new Set([CHROME_BUNDLE_ID, EDGE_BUNDLE_ID]);

/**
 * Determines the target browser application that is compatible with the Luna platform.
 *
 * @returns A Promise that resolves to the target browser application, or `undefined` if no compatible browser is found.
 */
const targetBrowser = (async (): Promise<Application | undefined> => {
  const installedApplications = await getApplications();
  const target = installedApplications.find((app) =>
    app.bundleId ? LUNA_COMPATIBLE_BUNDLES.has(app.bundleId) : false
  );
  return target;
})();

/**
 * Opens the specified URL in the target browser application.
 *
 * @param url The URL to open.
 * @returns A Promise that resolves when the URL has been opened.
 */
export async function openUrl(url: string): Promise<void> {
  const browser = await targetBrowser;
  await open(url, browser);
}
