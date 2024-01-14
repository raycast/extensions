import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();

  // If "Manually finish sessions and breaks" is selected,
  // and the current interval has run over time,
  // 'start' is the only AppleScript command that mimics
  // clicking the "Finish" button
  await runAppleScript('tell application "Tomito" to start');
};
