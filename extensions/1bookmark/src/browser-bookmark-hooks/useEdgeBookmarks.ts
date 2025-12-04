import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const EDGE_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/Microsoft Edge`;

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGE_BOOKMARKS_PATH,
    browserName: "Edge",
    browserIcon: "edge.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edge,
  });
}
