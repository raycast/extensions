import { closeMainWindow, confirmAlert, Icon, showToast, Toast, open } from "@raycast/api";
import { getPipApp } from "./utils/common-utils";
import { pipBrowserVideo, pipIina } from "./utils/applescript-utils";
import {
  EXTENSION_README,
  IINA,
  NEED_ALLOW_JAVA_SCRIPT,
  NEED_ALLOW_JAVA_SCRIPT_TIP,
  NEED_ALLOW_JAVA_SCRIPT_TIP_MESSAGE,
} from "./utils/constants";

export default async () => {
  await closeMainWindow();
  const pipApp = await getPipApp();
  if (pipApp.supportApp) {
    const supportApp = pipApp.supportApp;
    if (supportApp.path === IINA) {
      await pipIina();
    } else {
      const retTogglePip = await pipBrowserVideo(supportApp.name);
      if (retTogglePip) {
        await showToast({
          title: `Failed to toggle ${supportApp.name} in PiP`,
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
    }
  } else {
    if (pipApp.frontmostApp) {
      await showToast({ title: `The frontmost app is ${pipApp.frontmostApp.name}`, style: Toast.Style.Failure });
    } else {
      await showToast({ title: "Unable to get the frontmost app", style: Toast.Style.Failure });
    }
  }
};
