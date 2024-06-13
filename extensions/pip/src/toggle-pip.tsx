import { closeMainWindow, confirmAlert, Icon, showToast, Toast, open } from "@raycast/api";
import { isFrontmostBrowser } from "./utils/common-utils";
import { pipBrowserVideo } from "./utils/applescript-utils";
import {
  EXTENSION_README,
  NEED_ALLOW_JAVA_SCRIPT,
  NEED_ALLOW_JAVA_SCRIPT_TIP,
  NEED_ALLOW_JAVA_SCRIPT_TIP_MESSAGE,
} from "./utils/constants";

export default async () => {
  await closeMainWindow();
  const browser = await isFrontmostBrowser();
  if (browser) {
    const retTogglePip = await pipBrowserVideo(browser.name);
    if (retTogglePip) {
      await showToast({
        title: `Failed to toggle ${browser.name} in PiP`,
        message: retTogglePip,
        style: Toast.Style.Failure,
      });
      if (retTogglePip.includes(NEED_ALLOW_JAVA_SCRIPT)) {
        await confirmAlert({
          icon: Icon.Terminal,
          title: NEED_ALLOW_JAVA_SCRIPT_TIP,
          message: NEED_ALLOW_JAVA_SCRIPT_TIP_MESSAGE,
          primaryAction: {
            title: "How to Setup",
            onAction: async () => {
              await open(EXTENSION_README);
            },
          },
        });
      }
    }
  } else {
    await showToast({ title: `The frontmost app is not a browser`, style: Toast.Style.Failure });
  }
};
