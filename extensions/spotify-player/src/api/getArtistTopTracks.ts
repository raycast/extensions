import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getArtistTopTracks(artistId: string) {
  const { spotifyClient } = getSpotifyClient();

  // `from_token` is a special string that we use instead of a specific market code
  // so it uses the locale from the auth token
  const response = await spotifyClient.getArtistTopTracks(artistId, "from_token");
  return response.body;
}
