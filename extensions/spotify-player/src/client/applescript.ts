import { runAppleScript } from "run-applescript";
import scripts from "./applescript-scripts";
import { SpotifyState, TrackInfo } from "./types";

export type SpotifyPlayingState = "playing" | "paused" | "stopped";

export async function getTrack(): Promise<TrackInfo> {
  const response = await runAppleScript(scripts.track);

  return JSON.parse(response) as TrackInfo;
}
export async function getState(): Promise<SpotifyState> {
  const response = await runAppleScript(scripts.state);

  return JSON.parse(response) as SpotifyState;
}
export async function playTrack(uri: string) {
  await runAppleScript(scripts.playTrack(uri));
}
export async function jumpTo(second: number) {
  await runAppleScript(scripts.jumpTo(second));
}
export async function play() {
  await runAppleScript(buildScriptEnsuringSpotifyIsRunning(scripts.play));
}
export async function pause() {
  await runAppleScript(buildScriptEnsuringSpotifyIsRunning(scripts.pause));
}
export async function playPause() {
  await runAppleScript(buildScriptEnsuringSpotifyIsRunning(scripts.playPause));
}
export async function nextTrack() {
  await runAppleScript(buildScriptEnsuringSpotifyIsRunning(scripts.next));
}
export async function previousTrack() {
  await runAppleScript(buildScriptEnsuringSpotifyIsRunning(scripts.previous));
}
export async function volumeUp() {
  await runAppleScript(scripts.volumeUp);
}
export async function volumeDown() {
  await runAppleScript(scripts.volumeDown);
}
export async function setVolume(volume: number) {
  await runAppleScript(scripts.setVolume(volume));
}
export async function isRunning(): Promise<boolean> {
  const response = await runAppleScript(scripts.isRunning);

  return response === "true";
}
export async function isRepeating(): Promise<boolean> {
  const response = await runAppleScript(scripts.isRepeating);

  return response === "true";
}
export async function isShuffling(): Promise<boolean> {
  const response = await runAppleScript(scripts.isShuffling);

  return response === "true";
}
export async function setRepeating(repeating: boolean) {
  await runAppleScript(scripts.setRepeating(repeating));
}
export async function toggleRepeating() {
  await runAppleScript(scripts.toggleRepeating);
}
export async function setShuffling(shuffling: boolean) {
  await runAppleScript(scripts.setRepeating(shuffling));
}
export async function toggleShuffling() {
  await runAppleScript(scripts.toggleShuffling);
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
