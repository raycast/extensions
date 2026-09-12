import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkPagesInstalled } from "./index";

export default async function main() {
  // Check for Pages app
  const installed = await checkPagesInstalled();
  if (installed) {
    await runAppleScript('tell application "Pages" to set the miniaturized of every window to true');
    showHUD("Minimized Pages");
  }
}
