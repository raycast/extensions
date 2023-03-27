import { EpisodeObject, TrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getCurrentlyPlaying() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlayerCurrentlyPlaying({ additionalTypes: "episode" });

  if (response) {
    return {
      ...response,
      item: response.item as unknown as EpisodeObject | TrackObject,
    };
  }
  return response;
}
