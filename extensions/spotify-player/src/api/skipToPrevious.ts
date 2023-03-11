import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToPrevious() {
  const { spotifyClient } = getSpotifyClient();
  await spotifyClient.skipToPrevious();
}
