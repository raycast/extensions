import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const WHALE_PATH = `${homedir()}/Library/Application Support/Naver/Whale`;

export default function useChromeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: WHALE_PATH,
    browserName: "Whale",
    browserIcon: "whale.png",
    browserBundleId: BROWSERS_BUNDLE_ID.whale,
  });
}
