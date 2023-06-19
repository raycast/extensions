import { runAppleScript } from "@raycast/utils";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getCurrentlyPlayingUri() {
  const { spotifyClient } = getSpotifyClient();

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
        return currentUri
    else
        return "Not playing"
    end if`;

    const scriptResponse = await runAppleScript(script);

    if (scriptResponse === "Not running") {
      try {
        const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });

        if (response) {
          const { uri } = response.item as unknown as EpisodeObject | TrackObject;
          return uri;
        }
      } catch (err) {
        const error = getErrorMessage(err);
        console.log("getCurrentlyPlayingUri.ts Error:", error);
        throw new Error(error);
      }
    } else if (scriptResponse === "Not playing") {
      return undefined;
    } else {
      return scriptResponse;
    }
  }
}
