import { closeMainWindow, getApplications, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * Builds AppleScript to ensure Spotify is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterSpotifyIsRunning - The AppleScript command(s) to run after ensuring Spotify is running.
 * @returns Generated AppleScript.
 */
export function buildScriptEnsuringSpotifyIsRunning(commandsToRunAfterSpotifyIsRunning: string): string {
  return `
    tell application "Spotify"
      if not application "Spotify" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "Spotify" is running
          delay 1
          set _openCounter to _openCounter + 1
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat
      end if
      ${commandsToRunAfterSpotifyIsRunning}
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
  await closeMainWindow({ clearRootSearch: true });

  const applications = await getApplications();
  const isSpotifyInstalled = applications.some((app) => app.name === "Spotify");
  if (!isSpotifyInstalled) {
    await showHUD("Spotify is not installed");
    return;
  }

  await runAppleScript(appleScript);
}
