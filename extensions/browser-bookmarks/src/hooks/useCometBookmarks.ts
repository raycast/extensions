import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const COMET_PATH = `${homedir()}/Library/Application Support/Comet`;

export default function useCometBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: COMET_PATH,
    browserName: "Comet",
    browserIcon: "comet.png",
    browserBundleId: BROWSERS_BUNDLE_ID.comet,
  });
}
