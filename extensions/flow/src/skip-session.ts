import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function skipSession() {
  await runAppleScript("tell application \"Flow\" to skip");
  await showHUD("Session skipped");
}
