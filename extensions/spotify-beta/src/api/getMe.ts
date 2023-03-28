import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getArtistTopTracks() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMe();
  return response;
}
