import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getUserPlaylists() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getUserPlaylists();
  return response.body;
}
