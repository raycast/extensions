import { homedir } from "os";

import { BROWSERS_BUNDLE_ID, getBrowserDataPath } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const VIVALDI_SNAPSHOT_BOOKMARKS_PATH = getBrowserDataPath(
  BROWSERS_BUNDLE_ID.vivaldiSnapshot,
  `${homedir()}/Library/Application Support/Vivaldi Snapshot`,
);

export default function useVivaldiSnapshotBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: VIVALDI_SNAPSHOT_BOOKMARKS_PATH,
    browserName: "Vivaldi Snapshot",
    browserIcon: "vivaldi.png",
    browserBundleId: BROWSERS_BUNDLE_ID.vivaldiSnapshot,
  });
}
