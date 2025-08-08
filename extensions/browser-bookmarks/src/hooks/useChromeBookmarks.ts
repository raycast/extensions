import { homedir } from "os";
import path from "path";
import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";
const isWin = process.platform === "win32";

let CHROME_PATH = `${homedir()}/Library/Application Support/Google/Chrome`;

if (isWin) {
  CHROME_PATH = path.join(homedir(), `/AppData/Local/Google/Chrome/User Data`);
}

export default function useChromeBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHROME_PATH,
    browserName: "Chrome",
    browserIcon: "chrome.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chrome,
  });
}
