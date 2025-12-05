import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const SIDEKICK_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/Sidekick`
  : `${homedir()}\\AppData\\Local\\Sidekick\\User Data`;

export default function useSidekickBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: SIDEKICK_BOOKMARKS_PATH,
    browserName: "Sidekick",
    browserIcon: "sidekick.png",
    browserBundleId: BROWSERS_BUNDLE_ID.sidekick,
  });
}
