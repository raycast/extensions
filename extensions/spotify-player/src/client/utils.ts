import { closeMainWindow, getApplications, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function isSpotifyInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.spotify.client");
}

export function trackTitle(track: SpotifyApi.TrackObjectSimplified): string {
  return `${track.artists[0].name} – ${track.name}`;
}

export async function spotifyApplicationName(): Promise<string> {
  const installedApplications = await getApplications();
  const spotifyApplication = installedApplications.find((a) => a.bundleId?.includes("spotify"));

  if (spotifyApplication) {
    return spotifyApplication.name;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Check if you have Spotify app is installed on your Mac",
  });
  return "Spotify";
}

export enum SpotifyPlayingState {
  Playing = "playing",
  Paused = "paused",
  Stopped = "stopped",
}

export async function spotifyPlayingState(): Promise<SpotifyPlayingState> {
  const script = `
  if application "Spotify" is not running then
	return "stopped"
end if

property playerState : "stopped"

tell application "Spotify"
	try
		set playerState to player state as string
	end try
end tell

return playerState`;

  try {
    const response = await runAppleScript(script);
    const result = response as SpotifyPlayingState;
    return result;
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed getting playback",
    });
    return SpotifyPlayingState.Stopped;
  }
}

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
  await closeMainWindow();
  await runAppleScript(appleScript);
}
