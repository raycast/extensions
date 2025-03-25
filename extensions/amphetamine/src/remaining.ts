import { Toast, showHUD, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { AMPHETAMINE_DOWNLOAD_URL, checkIfAmphetamineInstalled } from "./utils";

const RemainingTimeResults = {
  "0": "Your current session has infinite duration.",
  "-1": "Your session is Trigger-based.",
  "-2": "Your session is whether app-based (while X app is running) or date-based (until XX:XX time).",
  "-3": "There is no session running.",
};

export default async function Command() {
  const ONE_HOUR_IN_SECONDS = 3600;
  const ONE_MINUTE_IN_SECONDS = 60;

  const toast = new Toast({
    title: "Getting remaining time",
    style: Toast.Style.Animated,
  });

  toast.show();

  const amphetamineAvailable = await checkIfAmphetamineInstalled();
  if (!amphetamineAvailable) {
    toast.title = "Amphetamine is not installed";
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

  let remainingTime = await runAppleScript(`
    tell application "Amphetamine"
    		return session time remaining
    end tell
  `);

  if (Number(remainingTime) > 0) {
    const hours = ~~(Number(remainingTime) / ONE_HOUR_IN_SECONDS);
    const minutes = ~~((Number(remainingTime) % ONE_HOUR_IN_SECONDS) / ONE_MINUTE_IN_SECONDS);

    if (hours > 0) {
      remainingTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}h`;
    } else {
      const seconds = ~~(Number(remainingTime) % ONE_MINUTE_IN_SECONDS);
      remainingTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}min`;
    }
  }

  await showHUD(
    RemainingTimeResults[remainingTime as keyof typeof RemainingTimeResults] ?? `Remaining time: ${remainingTime}`
  );
}
