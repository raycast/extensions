import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const BRAVE_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/BraveSoftware/Brave-Browser`
  : `${homedir()}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data`;

export default function useBraveBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: BRAVE_BOOKMARKS_PATH,
    browserName: "Brave",
    browserIcon: "brave.png",
    browserBundleId: BROWSERS_BUNDLE_ID.brave,
  });
}
