import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const ISLAND_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Island`
  : `${homedir()}\\AppData\\Local\\Island\\User Data`;

export default function useBraveBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: ISLAND_BOOKMARKS_PATH,
    browserName: "Island",
    browserIcon: "island.png",
    browserBundleId: BROWSERS_BUNDLE_ID.island,
  });
}
