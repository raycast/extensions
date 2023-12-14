import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const BRAVE_NIGHTLY_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/BraveSoftware/Brave-Browser-Nightly`;

export default function useBraveBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: BRAVE_NIGHTLY_BOOKMARKS_PATH,
    browserName: "Brave Nightly",
    browserIcon: "brave-nightly.png",
    browserBundleId: BROWSERS_BUNDLE_ID.braveNightly,
  });
}
