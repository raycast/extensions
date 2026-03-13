import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getMacOSDefaultBrowser } from "../browser-bookmark-utils/browsers";

export const BROWSERS_BUNDLE_ID = {
  arc: "company.thebrowser.browser",
  brave: "com.brave.browser",
  braveBeta: "com.brave.browser.beta",
  braveNightly: "com.brave.browser.nightly",
  chrome: "com.google.chrome",
  chromeBeta: "com.google.chrome.beta",
  chromeDev: "com.google.chrome.dev",
  firefox: "org.mozilla.firefox",
  firefoxDev: "org.mozilla.firefoxdeveloperedition",
  island: "io.island.island",
  safari: "com.apple.safari",
  sidekick: "com.pushplaylabs.sidekick",
  edge: "com.microsoft.edgemac",
  edgeDev: "com.microsoft.edgemac.dev",
  edgeCanary: "com.microsoft.edgemac.canary",
  prismaAccess: "com.talon-sec.work",
  vivaldi: "com.vivaldi.vivaldi",
  zen: "app.zen-browser.zen",
  whale: "com.naver.whale",
};

export const availableBrowsers = Object.values(BROWSERS_BUNDLE_ID);

export default function useAvailableBrowsers() {
  return useCachedPromise(async () => {
    const apps = await getApplications();
    const defaultBrowser = await getMacOSDefaultBrowser();
    return (
      apps
        // The default macOS browser's bundle ID is lowercased, so let's lowercase all bundleIds
        .map((app) => ({ ...app, bundleId: app.bundleId?.toLowerCase() }))
        .filter((app) => availableBrowsers.includes(app.bundleId?.toLowerCase() as string))
        // default browser should be first, then alphabetically
        .sort((a, b) => {
          if (a.bundleId === defaultBrowser.toLowerCase()) {
            return -1;
          }
          if (b.bundleId === defaultBrowser.toLowerCase()) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        })
    );
  });
}
