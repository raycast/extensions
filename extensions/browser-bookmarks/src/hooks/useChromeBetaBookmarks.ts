import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const CHROME_BETA_PATH = `${homedir()}/Library/Application Support/Google/Chrome Beta`;

export default function useChromeBetaBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_BETA_PATH,
    browserName: "Chrome Beta",
    browserIcon: "chrome-beta.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chromeBeta,
  });
}
