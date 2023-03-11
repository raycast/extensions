import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getCurrentPlayingTrack() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMyCurrentPlayingTrack();
  return response.body;
}
