import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMyPlaylists() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlaylists({ limit: 50 });
  return response;
}
