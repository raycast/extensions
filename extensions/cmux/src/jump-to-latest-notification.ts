import { closeMainWindow, showHUD } from "@raycast/api";
import { execFileAsync, openCmuxApp } from "./cli";

export default async function Command() {
  try {
    await openCmuxApp();
    await execFileAsync("osascript", [
      "-e",
      'tell application "cmux" to activate',
      "-e",
      'tell application "System Events" to keystroke "u" using {shift down, command down}',
    ]);
  } catch {
    await showHUD("Failed to send shortcut — check Accessibility permissions in System Settings");
    return;
  }
  await closeMainWindow();
}
