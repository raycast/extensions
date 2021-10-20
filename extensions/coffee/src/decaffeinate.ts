import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  await runAppleScript('do shell script "killall caffeinate"');
  await showHUD("Your Mac is decaffeinated");
}
