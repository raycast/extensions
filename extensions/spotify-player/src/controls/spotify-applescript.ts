import { closeMainWindow, getApplications, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { runAppleScript } from "run-applescript";
import { promisify } from "util";
import { CurrentlyPlayingTrack, Response } from "../client/interfaces";
import { showNextTrackNotification, showPreviousTrackNotification } from "./trackNotification";

const execp = promisify(exec);

export const notPlayingErrorMessage = "Spotify Is Not Playing";

export enum SpotifyPlayingState {
  Playing = "playing",
  Paused = "paused",
  Stopped = "stopped",
}

export async function isSpotifyPlaying(): Promise<SpotifyPlayingState> {
  const spotifyName = await spotifyApplicationName();
  const script = `
  if application "${spotifyName}" is not running then
	return "stopped"
end if

property playerState : "stopped"

tell application "${spotifyName}"
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
    return SpotifyPlayingState.Stopped;
  }
}

async function spotifyApplicationName(): Promise<string | undefined> {
  const installedApplications = await getApplications();
  const spotifyApplication = installedApplications.find((a) => a.bundleId?.includes("spotify"));

  if (spotifyApplication) {
    return spotifyApplication.name;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Check if you have Spotify app is installed on your Mac",
  });
}

export async function currentPlayingTrack(): Promise<Response<CurrentlyPlayingTrack> | undefined> {
  const spotifyName = await spotifyApplicationName();
  const script = `
if application "${spotifyName}" is not running then
	return "${notPlayingErrorMessage}"
end if

property currentTrackId : "Unknown Track"
property currentTrackArtist : "Unknown Artist"
property currentTrackName : "Unknown Name"
property playerState : "stopped"

tell application "${spotifyName}"
	try
		set currentTrackId to id of the current track
		set currentTrackArtist to artist of the current track
		set currentTrackName to name of the current track
		set playerState to player state as string
	end try
end tell


if playerState is "playing" then
  return "{ \\"id\\": \\"" & currentTrackId & "\\", \\"name\\": \\"" & currentTrackName & "\\", \\"artist\\": \\"" & currentTrackArtist & "\\"}"
else if playerState is "paused" then
  return "{ \\"id\\": \\"" & currentTrackId & "\\", \\"name\\": \\"" & currentTrackName & "\\", \\"artist\\": \\"" & currentTrackArtist & "\\"}"
else
	return "${notPlayingErrorMessage}"
end if`;
  try {
    const response = await runAppleScript(script);
    const error = response as string;
    if (error == notPlayingErrorMessage) {
      return { error };
    }
    const track = JSON.parse(response as string) as CurrentlyPlayingTrack;
    return { result: track };
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed getting playing track",
    });
  }
  // Spotify disabled the scope for this...
  // await authorizeIfNeeded();
  // try {
  //   return await spotifyApi
  //     .getMyCurrentPlayingTrack()
  //     .then((response: { body: any }) => response.body as SpotifyApi.CurrentlyPlayingResponse);
  // } catch (e: any) {
  //   return e as unknown as SpotifyApi.ErrorObject;
  // }
}

export async function playSong(uri: string): Promise<void> {
  const spotifyName = await spotifyApplicationName();
  await execp(`
    osascript -e 'tell application "${spotifyName}" to play track "${uri}"'
  `);
}

export async function play() {
  const script = await buildScriptEnsuringSpotifyIsRunning(`play`);
  await runAppleScriptSilently(script);
}

export async function pause() {
  const script = await buildScriptEnsuringSpotifyIsRunning(`pause`);
  await runAppleScriptSilently(script);
}

export async function nextTrack() {
  const script = await buildScriptEnsuringSpotifyIsRunning(`next track`);
  await runAppleScriptSilently(script);
  await showNextTrackNotification();
}

export async function previousTrack() {
  const script = await buildScriptEnsuringSpotifyIsRunning("previous track");
  await runAppleScriptSilently(script);
  await showPreviousTrackNotification();
}

/**
 * Builds AppleScript to ensure Spotify is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterSpotifyIsRunning - The AppleScript command(s) to run after ensuring Spotify is running.
 * @returns Generated AppleScript.
 */
export async function buildScriptEnsuringSpotifyIsRunning(commandsToRunAfterSpotifyIsRunning: string): Promise<string> {
  const spotifyName = await spotifyApplicationName();
  return `
    tell application "${spotifyName}"
      if not application "Spotify" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "${spotifyName}" is running
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
