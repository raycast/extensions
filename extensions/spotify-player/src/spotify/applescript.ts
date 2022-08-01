import { getApplications, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import scripts from "./applescript-scripts";
import { SpotifyState, TrackInfo } from "./types";

export type SpotifyPlayingState = "playing" | "paused" | "stopped";

export async function getTrack(): Promise<TrackInfo> {
  const applicationName = await spotifyApplicationName();
  const response = await runAppleScript(scripts.track(applicationName));

  return JSON.parse(response) as TrackInfo;
}
export async function getState(): Promise<SpotifyState> {
  const applicationName = await spotifyApplicationName();
  const response = await runAppleScript(scripts.state(applicationName));

  return JSON.parse(response) as SpotifyState;
}
export async function playTrack(uri: string) {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.playTrack(applicationName, uri));
}
export async function jumpTo(second: number) {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.jumpTo(applicationName, second));
}
export async function play() {
  await runAppleScript(await buildScriptEnsuringSpotifyIsRunning(scripts.play));
}
export async function pause() {
  await runAppleScript(await buildScriptEnsuringSpotifyIsRunning(scripts.pause));
}
export async function playPause() {
  await runAppleScript(await buildScriptEnsuringSpotifyIsRunning(scripts.playPause));
}
export async function nextTrack() {
  await runAppleScript(await buildScriptEnsuringSpotifyIsRunning(scripts.next));
}
export async function previousTrack() {
  await runAppleScript(await buildScriptEnsuringSpotifyIsRunning(scripts.previous));
}
export async function volumeUp() {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.volumeUp(applicationName));
}
export async function volumeDown() {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.volumeDown(applicationName));
}
export async function setVolume(volume: number) {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.setVolume(applicationName, volume));
}
export async function isRunning(): Promise<boolean> {
  const applicationName = await spotifyApplicationName();
  const response = await runAppleScript(scripts.isRunning(applicationName));

  return response === "true";
}
export async function isRepeating(): Promise<boolean> {
  const applicationName = await spotifyApplicationName();
  const response = await runAppleScript(scripts.isRepeating(applicationName));

  return response === "true";
}
export async function isShuffling(): Promise<boolean> {
  const applicationName = await spotifyApplicationName();
  const response = await runAppleScript(scripts.isShuffling(applicationName));

  return response === "true";
}
export async function setRepeating(repeating: boolean) {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.setRepeating(applicationName, repeating));
}
export async function toggleRepeating() {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.toggleRepeating(applicationName));
}
export async function setShuffling(shuffling: boolean) {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.setRepeating(applicationName, shuffling));
}
export async function toggleShuffling() {
  const applicationName = await spotifyApplicationName();
  await runAppleScript(scripts.toggleShuffling(applicationName));
}

/**
 * Builds AppleScript to ensure Spotify is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterSpotifyIsRunning - The AppleScript command(s) to run after ensuring Spotify is running.
 * @returns Generated AppleScript.
 */
export async function buildScriptEnsuringSpotifyIsRunning(commandsToRunAfterSpotifyIsRunning: string): Promise<string> {
  const applicationName = await spotifyApplicationName();

  return `
    tell application "${applicationName}"
      if not application "${applicationName}" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "${applicationName}" is running
          delay 1
          set _openCounter to _openCounter + 1
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat
      end if
      ${commandsToRunAfterSpotifyIsRunning}
    end tell`;
}

async function spotifyApplicationName(): Promise<string> {
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
