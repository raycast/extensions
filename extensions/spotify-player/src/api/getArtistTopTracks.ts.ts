import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getErrorMessage } from "../helpers/getError";
import { getMe } from "./getMe";

type GetAlbumTracksProps = {
  artistId: string;
};

export async function getArtistTopTracks({ artistId }: GetAlbumTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const me = await getMe();
    const response = await spotifyClient.getArtistsByIdTopTracks(artistId, { market: me.country });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getArtistTopTracks.ts Error:", error);
    throw new Error(error);
  }
}
