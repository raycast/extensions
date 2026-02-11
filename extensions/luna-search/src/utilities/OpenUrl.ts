import { Application, getApplications, open } from "@raycast/api";

/**
 * The bundle ID for the Google Chrome browser (macOS).
 */
const CHROME_BUNDLE_ID = "com.google.Chrome";

/**
 * The bundle ID for the Microsoft Edge browser (macOS).
 */
const EDGE_BUNDLE_ID = "com.microsoft.Edge";

/**
 * Windows executable paths for compatible browsers.
 */
const CHROME_WIN_PATH = "chrome.exe";
const EDGE_WIN_PATH = "msedge.exe";

/**
 * A set of bundle IDs for the browsers that are compatible with gameplay on Luna (macOS).
 */
const LUNA_COMPATIBLE_BUNDLES = new Set([CHROME_BUNDLE_ID, EDGE_BUNDLE_ID]);

/**
 * A set of executable names for compatible browsers (Windows).
 */
const LUNA_COMPATIBLE_WIN_EXES = new Set([CHROME_WIN_PATH, EDGE_WIN_PATH]);

/**
 * Determines the target browser application that is compatible with the Luna platform.
 *
 * @returns A Promise that resolves to the target browser application, or `undefined` if no compatible browser is found.
 */
const targetBrowser = (async (): Promise<Application | undefined> => {
  const installedApplications = await getApplications();

  if (process.platform === "win32") {
    // On Windows, match by executable path
    const target = installedApplications.find((app) => {
      if (!app.path) return false;
      const exeName = app.path.toLowerCase().split("\\").pop();
      return exeName ? LUNA_COMPATIBLE_WIN_EXES.has(exeName) : false;
    });
    return target;
  }

  // On macOS, match by bundle ID
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
