import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const ISLAND_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/Island`;

export default function useBraveBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: ISLAND_BOOKMARKS_PATH,
    browserName: "Island",
    browserIcon: "island.png",
    browserBundleId: BROWSERS_BUNDLE_ID.island,
  });
}
