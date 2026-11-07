import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const DIA_PATH = `${homedir()}/Library/Application Support/Dia/User Data`;

export default function useDiaBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: DIA_PATH,
    browserName: "Dia",
    browserIcon: "dia.png",
    browserBundleId: BROWSERS_BUNDLE_ID.dia,
  });
}
