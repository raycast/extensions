import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const EDGE_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Microsoft Edge`
  : `${homedir()}\\AppData\\Local\\Microsoft\\Edge\\User Data`;

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGE_BOOKMARKS_PATH,
    browserName: "Edge",
    browserIcon: "edge.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edge,
  });
}
