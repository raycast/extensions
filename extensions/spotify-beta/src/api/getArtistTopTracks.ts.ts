import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getMe } from "../helpers/spotify.api";

type GetAlbumTracksProps = {
  artistId: string;
};

export async function getArtistTopTracks({ artistId }: GetAlbumTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const me = await getMe();
  const response = await spotifyClient.getArtistsByIdTopTracks(artistId, { market: me.country });
  return response;
}
