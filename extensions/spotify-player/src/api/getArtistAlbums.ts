import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { Response } from "../spotify/interfaces";

export async function getArtistAlbums(artistId: string, limit: number): Promise<SpotifyApi.ArtistsAlbumsResponse> {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getArtistAlbums(artistId, { limit });
  return response.body;
}
