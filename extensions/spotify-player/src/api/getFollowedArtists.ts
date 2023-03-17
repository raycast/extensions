import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getFollowedArtists() {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getFollowedArtists();
  return response.body;
}
