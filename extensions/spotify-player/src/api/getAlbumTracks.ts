import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getAlbumTracks(albumId: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getAlbumTracks(albumId, { limit });
  return response.body;
}
