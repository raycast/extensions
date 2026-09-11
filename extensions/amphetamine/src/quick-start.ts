import { LaunchProps, Toast, getPreferenceValues, open, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { AMPHETAMINE_DOWNLOAD_URL, checkIfAmphetamineInstalled } from "./utils";

interface QuickStartArguments {
  hours?: string;
  minutes?: string;
  seconds?: string;
}

interface QuickStartPreferences {
  displaySleepAllowed: boolean;
}

/** Parse a duration argument: empty means 0, anything that isn't a whole number is invalid (null). */
function parseArgument(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default async function Command(props: LaunchProps<{ arguments: QuickStartArguments }>) {
  const toast = new Toast({
    title: "Starting a new session",
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

  const hours = parseArgument(props.arguments.hours);
  const minutes = parseArgument(props.arguments.minutes);
  const seconds = parseArgument(props.arguments.seconds);
  if (hours === null || minutes === null || seconds === null) {
    toast.title = "Invalid duration";
    toast.message = "Enter whole numbers only, or leave all fields empty for no time limit";
    toast.style = Toast.Style.Failure;
    return;
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  // Amphetamine's granularity is whole minutes; round any leftover seconds up. 0 means no time limit.
  const durationMinutes = Math.ceil(totalSeconds / 60);

  const { displaySleepAllowed } = getPreferenceValues<QuickStartPreferences>();

  const startSessionScript =
    durationMinutes === 0
      ? `start new session with options {duration: 0, interval: 0, displaySleepAllowed: ${displaySleepAllowed}}`
      : `start new session with options {duration: ${durationMinutes}, interval: minutes, displaySleepAllowed: ${displaySleepAllowed}}`;

  await runAppleScript(`
    tell application "Amphetamine"
        ${startSessionScript}
    end tell
  `);

  if (durationMinutes === 0) {
    await showHUD("Session started with no time limit");
  } else {
    const rounded = totalSeconds % 60 !== 0 ? " (rounded up)" : "";
    await showHUD(`Session started for ${formatMinutes(durationMinutes)}${rounded}`);
  }
}
