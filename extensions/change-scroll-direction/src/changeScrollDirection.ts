import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { fetchAppleScript } from "./scripts";

export default async function main() {
  try {
    await runAppleScriptSilently();
    await showHUD("Scroll direction changed");
  } catch (err) {
    await showHUD("Couldn't change scroll direction...");
  }
}

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is before running the AppleScript to keep the UI snappy.
 *
 * @param appleScript - The AppleScript to run
 * @throws An error when the AppleScript fails to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
async function runAppleScriptSilently() {
  await closeMainWindow();
  const appleScript = fetchAppleScript();
  await runAppleScript(appleScript);
}
