import { runAppleScript } from "@raycast/utils";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";

export async function getSpotifyAppData() {
  const isSpotifyInstalled = await checkSpotifyApp();

  if (isSpotifyInstalled) {
    const script = `
    if application "Spotify" is not running then
        return "Not running"
    end if
  
    property currentUri : "Unknown URI"
    property playerState : "stopped"
  
    tell application "Spotify"
        try
            set currentUri to id of the current track
            set playerState to player state as string
        end try
    end tell
  
    if playerState is "playing" then
        return currentUri
    else if playerState is "paused" then
        return currentUri & "(paused)"
    else
        return "Not playing"
    end if`;

    const scriptResponse = await runAppleScript(script);

    if (scriptResponse === "Not running") {
      return {
        state: "NOT_RUNNING",
        uri: undefined,
      };
    } else if (scriptResponse === "Not playing") {
      return {
        state: "NOT_PLAYING",
        uri: undefined,
      };
    } else {
      const state = scriptResponse.includes("(paused)") ? "PAUSED" : "PLAYING";
      const uri = scriptResponse.replace(" (paused)", "");
      return {
        state,
        uri,
      };
    }
  }
}
