import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const EDGEDEV_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Microsoft Edge Dev`
  : `${homedir()}\\AppData\\Local\\Microsoft\\Edge Dev\\User Data`;

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGEDEV_BOOKMARKS_PATH,
    browserName: "Edge Dev",
    browserIcon: "edgeDev.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edgeDev,
  });
}
