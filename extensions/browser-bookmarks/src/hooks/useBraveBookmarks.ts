import { homedir } from "os";

import { BROWSERS_BUNDLE_ID, getBrowserDataPath } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const BRAVE_BOOKMARKS_PATH = getBrowserDataPath(
  BROWSERS_BUNDLE_ID.brave,
  `${homedir()}/Library/Application Support/BraveSoftware/Brave-Browser`,
);

export default function useBraveBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: BRAVE_BOOKMARKS_PATH,
    browserName: "Brave",
    browserIcon: "brave.png",
    browserBundleId: BROWSERS_BUNDLE_ID.brave,
  });
}
