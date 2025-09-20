import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const GHOST_BROWSER_PATH = `${homedir()}/Library/Application Support/GhostBrowser`;

export default function useGhostBrowserBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: GHOST_BROWSER_PATH,
    browserName: "Ghost Browser",
    browserIcon: "ghost-browser.png",
    browserBundleId: BROWSERS_BUNDLE_ID.ghostBrowser,
  });
}
