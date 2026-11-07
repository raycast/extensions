import { homedir } from "os";

import { BROWSERS_BUNDLE_ID, getBrowserDataPath } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const VIVALDI_BOOKMARKS_PATH = getBrowserDataPath(
  BROWSERS_BUNDLE_ID.vivaldi,
  `${homedir()}/Library/Application Support/Vivaldi`,
);

export default function useVivaldiBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: VIVALDI_BOOKMARKS_PATH,
    browserName: "Vivaldi",
    browserIcon: "vivaldi.png",
    browserBundleId: BROWSERS_BUNDLE_ID.vivaldi,
  });
}
