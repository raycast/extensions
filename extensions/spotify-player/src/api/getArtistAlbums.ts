import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getArtistAlbums(artistId: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getArtistsByIdAlbums(artistId, { limit });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getArtistAlbums.ts Error:", error);
    throw new Error(error);
  }
}
