import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const SIDEKICK_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/Sidekick`;

export default function useSidekickBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: SIDEKICK_BOOKMARKS_PATH,
    browserName: "Sidekick",
    browserIcon: "sidekick.png",
    browserBundleId: BROWSERS_BUNDLE_ID.sidekick,
  });
}
