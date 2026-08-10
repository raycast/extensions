import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const CHROME_DEV_PATH = `${homedir()}/Library/Application Support/Google/Chrome Dev`;

export default function useChromeDevBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_DEV_PATH,
    browserName: "Chrome Dev",
    browserIcon: "chrome-dev.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chromeDev,
  });
}
