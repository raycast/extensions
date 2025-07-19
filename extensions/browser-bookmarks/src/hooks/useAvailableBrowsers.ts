import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import path from "path";

const isWin = process.platform === "win32";
const isMacOs = process.platform === "darwin";

export const BROWSERS_BUNDLE_ID = {
  arc: { bundleId: "company.thebrowser.browser" },
  brave: { bundleId: "com.brave.browser", windowsExeName: "brave.exe" },
  braveBeta: { bundleId: "com.brave.browser.beta", windowsExeName: "brave.exe" },
  braveNightly: {
    bundleId: "com.brave.browser.nightly",
    windowsExeName: "brave.exe",
  },
  chrome: {
    bundleId: "com.google.chrome",
    windowAppId: "817e2784-12eb-526a-b612-ad31c5436788",
    windowsExeName: "chrome.exe",
  },
  chromeBeta: { bundleId: "com.google.chrome.beta", windowsExeName: "chrome.exe" },
  chromeDev: { bundleId: "com.google.chrome.dev", windowsExeName: "chrome.exe" },
  dia: { bundleId: "company.thebrowser.dia" },
  firefox: { bundleId: "org.mozilla.firefox", windowsExeName: "firefox.exe" },
  firefoxDev: { bundleId: "org.mozilla.firefoxdeveloperedition", windowsExeName: "firefox.exe" },
  ghostBrowser: { bundleId: "com.ghostbrowser.gb1" },
  island: { bundleId: "io.island.island" },
  safari: { bundleId: "com.apple.safari" },
  sidekick: { bundleId: "com.pushplaylabs.sidekick", windowsExeName: "sidekick.exe" },
  edge: {
    bundleId: "com.microsoft.edgemac",
    windowsAppId: "e7251023-30d8-59e4-8ca4-2273b9f5ca83",
    windowsExeName: "msedge.exe",
  },
  edgeDev: { bundleId: "com.microsoft.edgemac.dev", windowsExeName: "msedge.exe" },
  edgeCanary: { bundleId: "com.microsoft.edgemac.canary", windowsExeName: "msedge.exe" },
  prismaAccess: { bundleId: "com.talon-sec.work" },
  vivaldi: { bundleId: "com.vivaldi.vivaldi", windowsExeName: "vivaldi.exe" },
  zen: { bundleId: "org.mozilla.com.zen.browser" },
  whale: { bundleId: "com.naver.whale", windowsExeName: "whale.exe" },
};

export default function useAvailableBrowsers() {
  return useCachedPromise(async () => {
    const apps = await getApplications();

    const knownBundleIds = new Set(
      Object.values(BROWSERS_BUNDLE_ID)
        .map((browser) => browser.bundleId?.toLowerCase())
        .filter(Boolean),
    );

    const knownWindowsExeNames = new Set(
      Object.values(BROWSERS_BUNDLE_ID)
        .map((browser) => browser.windowsExeName?.toLowerCase())
        .filter(Boolean),
    );

    // Optional: Uncomment these console logs for more detailed debugging
    // console.log("Known Bundle IDs:", Array.from(knownBundleIds));
    // console.log("Known Windows Executable Names:", Array.from(knownWindowsExeNames));
    //console.log(
    //  "Detected Apps:",
    //  apps.map((app) => ({ name: app.name, bundleId: app.bundleId, windowsAppId: app.windowsAppId, path: app.path })),
    //);

    return apps.filter((app) => {
      const appBundleId = app.bundleId?.toLowerCase();
      const appPath = app.path;

      if (isWin && appPath) {
        const exeName = path.basename(appPath).toLowerCase();
        return knownWindowsExeNames.has(exeName);
      }

      if (isMacOs && appBundleId) {
        // For macOS, continue to use bundleId
        return knownBundleIds.has(appBundleId);
      }

      return false;
    });
  });
}
