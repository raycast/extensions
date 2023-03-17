import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetUserPlaylistsProps = { limit?: number }

export async function getUserPlaylists({ limit = 20 }: GetUserPlaylistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getUserPlaylists({ limit });
  return response.body;
}
