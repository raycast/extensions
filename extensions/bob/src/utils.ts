import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkBobInstallation } from "./checkInstall";

/**
 * Builds AppleScript to ensure Bob is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterBobIsRunning - The AppleScript command(s) to run after ensuring Bob is running.
 * @returns Generated AppleScript.
 */
export function buildScriptEnsuringBobIsRunning(commandsToRunAfterBobIsRunning: string): string {
  return `
    tell application "Bob"
      if not application "Bob" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "Bob" is running
          delay 1
          set _openCounter to _openCounter + 1
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat
      end if
      tell application "System Events" to tell process "Bob"
        ${commandsToRunAfterBobIsRunning}
      end tell
    end tell`;
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
export async function runAppleScriptSilently(appleScript: string): Promise<void> {
  if (await checkBobInstallation()) {
    await closeMainWindow();
    await runAppleScript(appleScript);
  }
}

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
