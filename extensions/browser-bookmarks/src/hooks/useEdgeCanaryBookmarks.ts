import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const EDGECANARY_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/Microsoft Edge Canary`;

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGECANARY_BOOKMARKS_PATH,
    browserName: "Edge Canary",
    browserIcon: "edgeCanary.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edgeCanary,
  });
}
