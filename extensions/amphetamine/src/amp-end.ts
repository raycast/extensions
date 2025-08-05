import { Toast, showHUD, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { AMPHETAMINE_DOWNLOAD_URL, checkIfAmphetamineInstalled } from "./utils";

export default async function Command() {
  const toast = new Toast({
    title: "Ending current session...",
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

  if (isSessionActive === "false") {
    toast.title = "No Amphetamine session is running.";
    toast.style = Toast.Style.Failure;
    return;
  }

  await runAppleScript(`
    tell application "Amphetamine"
        end session
    end tell
  `);

  await showHUD("Ended current session.");
}
