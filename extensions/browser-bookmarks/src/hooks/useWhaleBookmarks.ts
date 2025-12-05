import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const WHALE_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Naver/Whale`
  : `${homedir()}\\AppData\\Local\\Naver\\Naver Whale\\User Data`;

export default function useChromeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: WHALE_PATH,
    browserName: "Whale",
    browserIcon: "whale.png",
    browserBundleId: BROWSERS_BUNDLE_ID.whale,
  });
}
