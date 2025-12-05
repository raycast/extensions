import { platform } from "os";

import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export const BROWSERS_BUNDLE_ID = {
  arc: "company.thebrowser.browser",
  brave: "com.brave.browser",
  braveBeta: "com.brave.browser.beta",
  braveNightly: "com.brave.browser.nightly",
  chrome: "com.google.chrome",
  chromeBeta: "com.google.chrome.beta",
  chromeDev: "com.google.chrome.dev",
  dia: "company.thebrowser.dia",
  chatGPTAtlas: "com.openai.atlas",
  firefox: "org.mozilla.firefox",
  firefoxDev: "org.mozilla.firefoxdeveloperedition",
  ghostBrowser: "com.ghostbrowser.gb1",
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

export type SimpleBrowser = {
  name: string;
  bundleId: string;
};

const isMacOS = platform() === "darwin";

export default function useAvailableBrowsers() {
  return useCachedPromise(async (): Promise<SimpleBrowser[]> => {
    // On macOS, use the real installed applications list (original behavior).
    if (isMacOS) {
      const apps = await getApplications();

      return apps
        .map((app) => ({
          name: app.name,
          bundleId: app.bundleId?.toLowerCase() ?? "",
        }))
        .filter((app) => availableBrowsers.includes(app.bundleId));
    }

    // On Windows and other non-macOS platforms, Raycast app metadata isn't available,
    // so return a synthetic list of supported browsers with stable IDs.
    return [
      { name: "Brave", bundleId: BROWSERS_BUNDLE_ID.brave },
      { name: "Brave Beta", bundleId: BROWSERS_BUNDLE_ID.braveBeta },
      { name: "Brave Nightly", bundleId: BROWSERS_BUNDLE_ID.braveNightly },
      { name: "Chrome", bundleId: BROWSERS_BUNDLE_ID.chrome },
      { name: "Chrome Beta", bundleId: BROWSERS_BUNDLE_ID.chromeBeta },
      { name: "Chrome Dev", bundleId: BROWSERS_BUNDLE_ID.chromeDev },
      { name: "Edge", bundleId: BROWSERS_BUNDLE_ID.edge },
      { name: "Edge Dev", bundleId: BROWSERS_BUNDLE_ID.edgeDev },
      { name: "Edge Canary", bundleId: BROWSERS_BUNDLE_ID.edgeCanary },
      { name: "Firefox", bundleId: BROWSERS_BUNDLE_ID.firefox },
      { name: "Firefox Dev", bundleId: BROWSERS_BUNDLE_ID.firefoxDev },
      { name: "Ghost Browser", bundleId: BROWSERS_BUNDLE_ID.ghostBrowser },
      { name: "Island", bundleId: BROWSERS_BUNDLE_ID.island },
      { name: "Sidekick", bundleId: BROWSERS_BUNDLE_ID.sidekick },
      { name: "Prisma Access", bundleId: BROWSERS_BUNDLE_ID.prismaAccess },
      { name: "Vivaldi", bundleId: BROWSERS_BUNDLE_ID.vivaldi },
      { name: "Zen", bundleId: BROWSERS_BUNDLE_ID.zen },
      { name: "Whale", bundleId: BROWSERS_BUNDLE_ID.whale },
    ];
  });
}
