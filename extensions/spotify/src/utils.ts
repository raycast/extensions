import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}