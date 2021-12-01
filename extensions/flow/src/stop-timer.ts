import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function stopTimer() {
  await runAppleScript("tell application \"Flow\" to stop");
  await showHUD("Timer stopped");
}
