import { runAppleScript } from "run-applescript";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getCurrentlyPlayingUri() {
  const { spotifyClient } = getSpotifyClient();

  const isSpotifyInstalled = await checkSpotifyApp();

  if (isSpotifyInstalled) {
    const script = `if application "Spotify" is running then
    tell application "Spotify"
      set cstate to "{"
      set cstate to cstate & "\\"uri\\": \\"" & current track's id & "\\""
      set cstate to cstate & ",\\"state\\": \\"" & player state & "\\""
      set cstate to cstate & "}"

      return cstate
    end tell
    else
      set cstate to "{}"
    end if`;

    const scriptResponse = await runAppleScript(script);
    const parsedResponse = JSON.parse(scriptResponse);

    if (parsedResponse?.uri) {
      return parsedResponse.uri as string;
    } else {
      try {
        console.log("Calling the Spotify API...");
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
    }
  }
}
