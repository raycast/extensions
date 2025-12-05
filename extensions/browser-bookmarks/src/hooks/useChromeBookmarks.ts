import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const CHROME_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Google/Chrome`
  : `${homedir()}\\AppData\\Local\\Google\\Chrome\\User Data`;

export default function useChromeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_PATH,
    browserName: "Chrome",
    browserIcon: "chrome.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chrome,
  });
}
