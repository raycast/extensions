import { withCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetFollowedArtistsProps = { limit?: number };

async function _getFollowedArtists({ limit = 50 }: GetFollowedArtistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeFollowing("artist", { limit });
    return response.artists;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getFollowedArtists.ts Error:", error);
    throw new Error(error);
  }
}

export const getFollowedArtists = withCache("api:library:artists", 300000, _getFollowedArtists);
