import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getArtistAlbums(artistId: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getArtistsByIdAlbums(artistId, { limit });
  return response;
}
