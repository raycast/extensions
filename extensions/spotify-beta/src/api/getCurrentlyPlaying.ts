import { runAppleScript } from "run-applescript";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getEpisode } from "./getEpisode";
import { getTrack } from "./getTrack";

export async function getCurrentlyPlaying() {
  const { spotifyClient } = getSpotifyClient();

  const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });

  if (response) {
    return {
      ...response,
      item: response.item as unknown as EpisodeObject | TrackObject,
    };
  }

  // Sometimes the `getMePlayerCurrentlyPlaying` doesn't return anything. This happens after some minutes of inactivity. So we fallback to the AppleScript API, to get the ID of the currently playing track/episode. We can then use the ID to fetch the track/episode data from the Spotify API.
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
      const type = parsedResponse.uri.includes("episode") ? "episode" : "track";
      const id = parsedResponse.uri.split(":")[2];
      console.log(parsedResponse, id, type);
      if (type === "episode") {
        const showResponse = await getEpisode(id);
        return {
          ...showResponse,
          currently_playing_type: "episode",
          is_playing: parsedResponse.state === "playing",
          item: showResponse as unknown as EpisodeObject | TrackObject,
        };
      }
      const trackResponse = await getTrack(id);

      return {
        ...trackResponse,
        currently_playing_type: "track",
        is_playing: parsedResponse.state === "playing",
        item: trackResponse as unknown as EpisodeObject | TrackObject,
      };
    }
  }

  return response;
}
