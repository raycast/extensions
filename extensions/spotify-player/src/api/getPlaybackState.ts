import { getErrorMessage } from "../helpers/getError";
import { CurrentlyPlayingContextObject, EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaybackState() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = (await spotifyClient.getMePlayer({ additionalTypes: "episode" })) as CurrentlyPlayingContextObject;
    if (response) {
      return {
        ...response,
        item: response.item as unknown as EpisodeObject | TrackObject,
      };
    }
    return undefined;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getPlaybackState.ts Error:", error);
    throw new Error(error);
  }
}
