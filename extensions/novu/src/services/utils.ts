import { closeMainWindow, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export function isJsonString(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export async function runAppleScriptSilently(appleScript: string): Promise<void> {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

export async function openBrowserSilently(url: string): Promise<void> {
  await closeMainWindow();
  await open(url);
}
