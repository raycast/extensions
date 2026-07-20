import { withCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

async function _getCurrentlyPlaying() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });
    if (response) {
      return {
        ...response,
        item: response.item as unknown as EpisodeObject | TrackObject,
      };
    }
    return undefined;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getCurrentlyPlaying.ts Error:", error);
    throw new Error(error);
  }
}

export const getCurrentlyPlaying = withCache("api:currently-playing", 10000, _getCurrentlyPlaying);
