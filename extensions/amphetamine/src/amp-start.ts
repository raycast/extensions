import { Toast, showHUD, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { AMPHETAMINE_DOWNLOAD_URL, checkIfAmphetamineInstalled } from "./utils";

export default async function Command() {
  const toast = new Toast({
    title: "Starting a new session",
    style: Toast.Style.Animated,
  });

  toast.show();

  const amphetamineAvailable = await checkIfAmphetamineInstalled();
  if (!amphetamineAvailable) {
    toast.title = "Amphetamine is no installed";
    toast.message = "Press Command + D to download";
    toast.primaryAction = {
      title: "Download",
      shortcut: {
        modifiers: ["cmd"],
        key: "d",
      },
      onAction: async () => await open(AMPHETAMINE_DOWNLOAD_URL),
    };
    toast.style = Toast.Style.Failure;
    return;
  }

  const isSessionActive = await runAppleScript(`
    tell application "Amphetamine"
    		return session is active
    end tell
  `);

  if (isSessionActive === "true") {
    toast.title = "A session is already running";
    toast.style = Toast.Style.Failure;
    return;
  }

  await runAppleScript(`
    tell application "Amphetamine"
        start new session
    end tell
  `);

  await showHUD("New default session started");
}
