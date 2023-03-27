import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMyPlaylists() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlaylists();
  return response;
}
