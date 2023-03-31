import { runAppleScript } from "run-applescript";
import { getErrorMessage } from "../helpers/getError";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getEpisode } from "./getEpisode";
import { getTrack } from "./getTrack";

export async function getCurrentlyPlaying() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });

    if (response) {
      return {
        ...response,
        item: response.item as unknown as EpisodeObject | TrackObject,
      };
    }

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
        // A uri looks like this: spotify:track:6v3KW9xbzN5yKLt9YKDYA2 or spotify:episode:6v3KW9xbzN5yKLt9YKDYA2
        const [_, type, id] = parsedResponse.uri.split(":");
        let trackOrShowResponse: EpisodeObject | TrackObject = {};
        if (type === "episode") {
          trackOrShowResponse = await getEpisode(id);
        } else {
          trackOrShowResponse = await getTrack(id);
        }

        return {
          ...trackOrShowResponse,
          currently_playing_type: type,
          is_playing: parsedResponse.state === "playing",
          item: trackOrShowResponse as unknown as EpisodeObject | TrackObject,
        };
      }
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getCurrentlyPlaying.ts Error:", error);
    throw new Error(error);
  }
}
