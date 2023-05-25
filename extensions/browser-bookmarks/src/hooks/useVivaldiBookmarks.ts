import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const CHROME_PATH = `${homedir()}/Library/Application Support/Vivaldi`;

export default function useVivaldiBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_PATH,
    browserName: "Vivaldi",
    browserIcon: "vivaldi.png",
    browserBundleId: BROWSERS_BUNDLE_ID.vivaldi,
  });
}
