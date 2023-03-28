import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetFollowedArtistsProps = { limit?: number };

export async function getFollowedArtists({ limit = 50 }: GetFollowedArtistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMeFollowing("artist", { limit });
  return response.artists;
}
