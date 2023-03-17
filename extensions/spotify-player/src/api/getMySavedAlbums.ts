import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedAlbumsProps = { limit?: number }

export async function getMySavedAlbums({ limit = 20 }: GetMySavedAlbumsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMySavedAlbums({ limit });
  return response.body;
}
