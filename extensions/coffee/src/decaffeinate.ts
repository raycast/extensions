import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  try {
    await runAppleScript(`do shell script "pgrep caffeinate"`);
    await runAppleScript('do shell script "killall caffeinate"');
    await showHUD("Your Mac is decaffeinated");
  } catch (_) {
    await showHUD("Your Mac is already decaffeinated");
  }
}
