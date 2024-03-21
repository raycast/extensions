import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const BRAVE_BETA_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/BraveSoftware/Brave-Browser-Beta`;

export default function useBraveBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: BRAVE_BETA_BOOKMARKS_PATH,
    browserName: "Brave Beta",
    browserIcon: "brave-beta.png",
    browserBundleId: BROWSERS_BUNDLE_ID.braveBeta,
  });
}
