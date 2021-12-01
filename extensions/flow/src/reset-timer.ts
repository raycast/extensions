import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function resetTimer() {
  await runAppleScript("tell application \"Flow\" to reset");
  await showHUD("Timer reset");
}
