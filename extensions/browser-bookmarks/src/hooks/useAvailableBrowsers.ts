import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export const BROWSERS_BUNDLE_ID = {
  brave: "com.brave.browser",
  chrome: "com.google.chrome",
  firefox: "org.mozilla.firefox",
  safari: "com.apple.safari",
  edge: "com.microsoft.edgemac",
};

export const availableBrowsers = Object.values(BROWSERS_BUNDLE_ID);

export default function useBrowsers() {
  return useCachedPromise(async () => {
    const apps = await getApplications();

    return (
      apps
        // The default macOS browser's bundle ID is lowercased, so let's lowercase all bundleIds
        .map((app) => ({ ...app, bundleId: app.bundleId?.toLowerCase() }))
        .filter((app) => availableBrowsers.includes(app.bundleId?.toLowerCase() as string))
    );
  });
}
