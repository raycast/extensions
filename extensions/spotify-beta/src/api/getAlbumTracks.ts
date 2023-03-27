import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetAlbumTracksProps = {
  albumId: string;
  limit: number;
};

export async function getAlbumTracks({ albumId, limit }: GetAlbumTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getAlbumsByIdTracks(albumId, { limit });
  return response;
}
