import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkNumbersInstalled } from "./index";

export default async function main() {
  // Check for Numbers app
  const installed = await checkNumbersInstalled();
  if (installed) {
    await runAppleScript('tell application "Numbers" to set the miniaturized of every window to true');
    showHUD("Minimized Numbers");
  }
}
