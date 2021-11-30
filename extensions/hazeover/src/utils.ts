// Credit to Raycast's spotify-controls extension for this file.
import { closeMainWindow, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is closed before running the AppleScript to keep the UI snappy.
 *
 * @param appleScript - The AppleScript to run
 * @param shouldPop - Indicates whether to reset the navigation stack
 * @throws An error when the AppleScript fails to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilently(appleScript: string, shouldPop: boolean) {
  await closeMainWindow();
  await runAppleScript(appleScript);
  if (shouldPop) {
    await popToRoot();
  }
}
