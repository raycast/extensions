import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript('activate application "Gather"');

  // Toggle microphone
  await runAppleScript('tell application "System Events" to key code 9 using {shift down, command down}');

  // Toggle camera
  await runAppleScript('tell application "System Events" to key code 0 using {shift down, command down}');
  
  // Toggle availability status
  await runAppleScript('tell application "System Events" to key code 32 using command down');
};