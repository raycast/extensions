import { runAppleScript } from "run-applescript";
import { closeMainWindow } from "@raycast/api";

export default async function hideTimer() {
  await runAppleScript("tell application \"Flow\" to hide");
  await closeMainWindow();
}
