import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const GHOST_BROWSER_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/GhostBrowser`
  : `${homedir()}\\AppData\\Local\\GhostBrowser\\User Data`;

export default function useGhostBrowserBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: GHOST_BROWSER_PATH,
    browserName: "Ghost Browser",
    browserIcon: "ghost-browser.png",
    browserBundleId: BROWSERS_BUNDLE_ID.ghostBrowser,
  });
}
