import { CurrentlyPlayingContextObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaybackState() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlayer();
  // Type is coming back as `unknown` for some reason
  return response as CurrentlyPlayingContextObject;
}
