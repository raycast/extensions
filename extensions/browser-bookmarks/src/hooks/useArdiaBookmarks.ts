import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const ARDIA_PATH = `${homedir()}/Library/Application Support/com.ardia.browser/Chromium`;

export default function useArdiaBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: ARDIA_PATH,
    browserName: "Ardia",
    browserIcon: "ardia.png",
    browserBundleId: BROWSERS_BUNDLE_ID.ardia,
  });
}
