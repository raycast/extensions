import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const CHROME_DEV_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Google/Chrome Dev`
  : `${homedir()}\\AppData\\Local\\Google\\Chrome Dev\\User Data`;

export default function useChromeDevBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_DEV_PATH,
    browserName: "Chrome Dev",
    browserIcon: "chrome-dev.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chromeDev,
  });
}
