import { Icon, Toast, confirmAlert, showToast, open } from "@raycast/api";
import { fullscreenBrowserVideo, fullscreenIina, pipBrowserVideo, pipIina } from "./applescript-utils";
import { getApps } from "./common-utils";
import {
  EXTENSION_README,
  IINA,
  NEED_ALLOW_JAVA_SCRIPT,
  NEED_ALLOW_JAVA_SCRIPT_TIP,
  NEED_ALLOW_JAVA_SCRIPT_TIP_MESSAGE,
  VideoActionType,
} from "./constants";

export async function handleVideoAction(videoAction: VideoActionType) {
  const apps = await getApps();
  if (apps.supportApp) {
    const supportApp = apps.supportApp;
    if (supportApp.path === IINA) {
      if (videoAction === VideoActionType.Fullscreen) {
        await fullscreenIina();
      } else if (videoAction === VideoActionType.Pip) {
        await pipIina();
      }
    } else {
      let retRunJavaScript;
      if (videoAction === VideoActionType.Fullscreen) {
        retRunJavaScript = await fullscreenBrowserVideo(supportApp.name);
      } else if (videoAction === VideoActionType.Pip) {
        retRunJavaScript = await pipBrowserVideo(supportApp.name);
      }

      if (retRunJavaScript) {
        await showToast({
          title: `Failed to run javascript in ${supportApp.name}`,
          message: retRunJavaScript,
          style: Toast.Style.Failure,
        });
        if (retRunJavaScript.includes(NEED_ALLOW_JAVA_SCRIPT)) {
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
    if (apps.frontmostApp) {
      await showToast({ title: `The frontmost app is ${apps.frontmostApp.name}`, style: Toast.Style.Failure });
    } else {
      await showToast({ title: "Unable to get the frontmost app", style: Toast.Style.Failure });
    }
  }
}
