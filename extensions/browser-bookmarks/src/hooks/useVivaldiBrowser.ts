import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const VIVALDI_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Vivaldi`
  : `${homedir()}\\AppData\\Local\\Vivaldi\\User Data`;

export default function useVivaldiBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: VIVALDI_BOOKMARKS_PATH,
    browserName: "Vivaldi",
    browserIcon: "vivaldi.png",
    browserBundleId: BROWSERS_BUNDLE_ID.vivaldi,
  });
}
