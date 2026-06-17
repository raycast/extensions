import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const HELIUM_PATH = `${homedir()}/Library/Application Support/net.imput.helium`;

export default function useHeliumBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: HELIUM_PATH,
    browserName: "Helium",
    browserIcon: "helium.png",
    browserBundleId: BROWSERS_BUNDLE_ID.helium,
  });
}
