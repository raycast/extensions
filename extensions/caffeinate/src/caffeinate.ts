import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  runAppleScript('do shell script "caffeinate -di"');
  await showHUD("Your Mac is caffeinated");
}
