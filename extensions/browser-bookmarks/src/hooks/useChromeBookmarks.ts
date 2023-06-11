import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const CHROME_PATH = `${homedir()}/Library/Application Support/Google/Chrome`;

export default function useChromeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_PATH,
    browserName: "Chrome",
    browserIcon: "chrome.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chrome,
  });
}
