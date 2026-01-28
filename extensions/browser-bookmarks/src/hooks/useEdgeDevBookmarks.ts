import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const EDGEDEV_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/Microsoft Edge Dev`;

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGEDEV_BOOKMARKS_PATH,
    browserName: "Edge Dev",
    browserIcon: "edgeDev.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edgeDev,
  });
}
