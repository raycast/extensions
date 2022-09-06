import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  await closeMainWindow();
  await runAppleScript('tell application "Bike" to set the miniaturized of every window to true');
}
