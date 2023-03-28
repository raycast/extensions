import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedAlbumsProps = { limit?: number };

export async function getMyPlaylists({ limit = 50 }: GetMySavedAlbumsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMePlaylists({ limit });
  return response;
}
