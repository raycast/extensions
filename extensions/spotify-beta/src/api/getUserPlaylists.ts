import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetUserPlaylistsProps = { limit?: number };

export async function getUserPlaylists({ limit = 50 }: GetUserPlaylistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlaylists({ limit });
  return response;
}
