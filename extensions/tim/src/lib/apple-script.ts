import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

/**
 * Builds AppleScript to ensure Tim is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterTimIsRunning - The AppleScript command(s) to run after ensuring Tim is running.
 * @returns Generated AppleScript.
 */
export function buildScriptEnsuringTimIsRunning(commandsToRunAfterTimIsRunning: string): string {
  return `
tell application "Tim"
  if not application "Tim" is running then
    activate

    set _maxOpenWaitTimeInSeconds to 5
    set _openCounter to 1
    repeat until application "Tim" is running
      delay 1
      set _openCounter to _openCounter + 1
      if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
    end repeat
  end if
  ${commandsToRunAfterTimIsRunning}
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
export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
