import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  await closeMainWindow();
  await runAppleScript('tell application "Bike" to make new document');
}
