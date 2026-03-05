import { Application, getApplications, getDefaultApplication } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const TEST_URL = "https://raycast.com";

// Bundle IDs known to NOT be browsers (false positives from getApplications)
const EXCLUDED_BUNDLE_IDS = new Set([
  "com.googlecode.iterm2",
  "com.charliemonroe.Downie-4",
  "com.apple.finder",
  "com.apple.Terminal",
]);

/** Hook: returns installed browsers, cached across renders */
export function useBrowsers() {
  return useCachedPromise(async () => {
    const apps = await getApplications(TEST_URL);
    return apps.filter((app) => !EXCLUDED_BUNDLE_IDS.has(app.bundleId ?? ""));
  });
}

/** Returns the system default browser */
export async function getDefaultBrowser(): Promise<Application> {
  return getDefaultApplication(TEST_URL);
}

/** Find a browser Application from a list by its bundle ID */
export function findBrowserByBundleId(browsers: Application[], bundleId: string): Application | undefined {
  return browsers.find((b) => b.bundleId === bundleId);
}
