import { Toast, showHUD, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { AMPHETAMINE_DOWNLOAD_URL, checkIfAmphetamineInstalled } from "./utils";

interface CommandArgs {
  duration: number;
  interval: "minutes" | "hours";
}

export default async function Command(args?: CommandArgs) {
  const duration = args?.duration;
  const interval = args?.interval;
  const parsedInterval = duration === 1 ? interval?.substring(0, interval.length - 1) : interval;

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
    return false;
  }

  const isSessionActive = await runAppleScript(`
    tell application "Amphetamine"
    		return session is active
    end tell
  `);

  if (isSessionActive === "true") {
    toast.title = "A session is already running";
    toast.style = Toast.Style.Failure;
    return false;
  }

  await runAppleScript(`
    tell application "Amphetamine"
        start new session ${
          duration ? `with options {duration: ${duration}, interval: ${interval}, displaySleepAllowed: false}` : ""
        }
    end tell
  `);

  await showHUD(duration ? `New session started with ${duration} ${parsedInterval}` : "New default session started");
  return true;
}
