import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetAlbumTracksProps = {
  albumId: string;
  limit: number;
};

export async function getAlbumTracks({ albumId, limit }: GetAlbumTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getAlbumsByIdTracks(albumId, { limit });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getAlbumTracks.ts Error:", error);
    throw new Error(error);
  }
}
