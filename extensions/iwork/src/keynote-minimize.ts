import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default async function main() {
  // Check for Keynote app
  const installed = await checkKeynoteInstalled();
  if (installed) {
    await runAppleScript('tell application "Keynote" to set the miniaturized of every window to true');
    showHUD("Minimized Keynote");
  }
}
