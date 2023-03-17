import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMySavedAlbums() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMySavedAlbums();
  return response.body;
}
