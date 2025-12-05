import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const EDGECANARY_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Microsoft Edge Canary`
  : `${homedir()}\\AppData\\Local\\Microsoft\\Edge SxS\\User Data`;

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGECANARY_BOOKMARKS_PATH,
    browserName: "Edge Canary",
    browserIcon: "edgeCanary.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edgeCanary,
  });
}
