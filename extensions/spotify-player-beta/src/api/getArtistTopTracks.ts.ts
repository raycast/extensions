import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetAlbumTracksProps = {
  artistId: string;
};

export async function getArtistTopTracks({ artistId }: GetAlbumTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const me = await spotifyClient.getMe();
  const response = await spotifyClient.getArtistsByIdTopTracks(artistId, { market: me.country });
  return response;
}
