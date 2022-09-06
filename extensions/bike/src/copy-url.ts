import { closeMainWindow, Clipboard, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  await closeMainWindow();
  const test = await runAppleScript(`tell application "Bike" to return URL of document 1`);
  console.log(test);
  await Clipboard.copy(test);
  await showHUD("Copied URL to clipboard!");
}
