// Credit to Raycast's spotify-controls extension for this file.
import { closeMainWindow, popToRoot, showHUD, showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is closed before running the AppleScript to keep the UI snappy.
 * A HUD is displayed if the AppleScript returns an error.
 *
 * @param appleScript - The AppleScript to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilentlyNoView(appleScript: string) {
  await closeMainWindow();
  try {
    await runAppleScript(appleScript);
  } catch {
    // HazeOver was not installed correctly.
    await showHUD("HazeOver didn't respond! Check your HazeOver installation.");
  }
}

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is closed after running the AppleScript to allow for the possibility to show a Toast.
 * A Toast is displayed if the AppleScript returns an error.
 *
 * @param appleScript - The AppleScript to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilentlyView(appleScript: string) {
  try {
    await runAppleScript(appleScript);
    await closeMainWindow();
  } catch {
    // HazeOver was not installed correctly.
    await showToast(ToastStyle.Failure, "HazeOver didn't respond!", "Check your HazeOver installation.");
  }
  await popToRoot();
}
