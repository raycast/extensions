import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetFollowedArtistsProps = { limit?: number };

export async function getFollowedArtists({ limit = 20 }: GetFollowedArtistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getFollowedArtists({ limit });
  return response.body;
}
