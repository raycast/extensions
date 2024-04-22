/**
 * Builds AppleScript to ensure IINA.app is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterIINAIsRunning - The AppleScript command(s) to run after ensuring Spotify is running.
 * @returns Generated AppleScript.
 */
export function buildScriptEnsuringIINAIsRunning(
  commandsToRunAfterIINAIsRunning: string,
): string {
  return `
      tell application "IINA"
        if not application "IINA" is running then
          activate

          set _maxOpenWaitTimeInSeconds to 5
          set _openCounter to 1
          repeat until application "IINA" is running
            delay 1
            set _openCounter to _openCounter + 1
            if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
          end repeat
        end if

      ${commandsToRunAfterIINAIsRunning}
      end tell`;
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url);

    return true;
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      return false;
    } else {
      return false;
    }
  }
}
