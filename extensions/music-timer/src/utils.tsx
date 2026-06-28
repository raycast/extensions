import { runAppleScript } from "run-applescript";

/**
 * Builds AppleScript to ensure Music Timer is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterMusicTimerIsRunning - The AppleScript command(s) to run after ensuring Music Timer is running.
 * @returns Generated AppleScript.
 */
export function buildScriptEnsuringMusicTimerIsRunning(duration: number, breakDuration: number): string {
  return `
      tell application "Music Timer"
        if not application "Music Timer" is running then
          activate

          set _maxOpenWaitTimeInSeconds to 5
          set _openCounter to 1
          repeat until application "Music Timer" is running
            delay 1
            set _openCounter to _openCounter + 1
            if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
          end repeat
        end if
        start (make new session with properties {duration:${duration}, breakDuration:${breakDuration}})
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
export async function runAppleScriptSilently(duration: number, breakDuration: number) {
  await runAppleScript(buildScriptEnsuringMusicTimerIsRunning(duration, breakDuration));
}
