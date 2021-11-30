// Credit to Raycast's spotify-controls extension for this file.
import { closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is closed before running the AppleScript to keep the UI snappy.
 * A HUD is displayed if the AppleScript returns an error.
 *
 * @param appleScript - The AppleScript to run
 * @param shouldPop - Indicates whether to reset the navigation stack
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilently(appleScript: string, shouldPop: boolean) {
  await closeMainWindow();
  try {
    await runAppleScript(appleScript);
  } catch {
    // HazeOver was not installed correctly.
    // Avoid "dead" screen by disregarding error.
    await showHUD("Oh no! Something went wrong. Check your HazeOver installation.");
  }
  if (shouldPop) {
    await popToRoot();
  }
}
