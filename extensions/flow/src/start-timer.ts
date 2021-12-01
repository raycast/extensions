import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function startTimer() {
  await runAppleScript("tell application \"Flow\" to start");
  await showHUD("Timer started");
}
