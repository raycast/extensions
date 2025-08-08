import { homedir } from "os";
import path from "path";
import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isWin = process.platform === "win32";

let EDGE_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/Microsoft Edge`;

if (isWin) {
  EDGE_BOOKMARKS_PATH = path.join(homedir(), `/AppData/Local/Microsoft/Edge/User Data`);
}

export default function useEdgeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: EDGE_BOOKMARKS_PATH,
    browserName: "Edge",
    browserIcon: "edge.png",
    browserBundleId: BROWSERS_BUNDLE_ID.edge,
  });
}
