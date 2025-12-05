import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const CHROME_BETA_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Google/Chrome Beta`
  : `${homedir()}\\AppData\\Local\\Google\\Chrome Beta\\User Data`;

export default function useChromeBetaBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_BETA_PATH,
    browserName: "Chrome Beta",
    browserIcon: "chrome-beta.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chromeBeta,
  });
}
