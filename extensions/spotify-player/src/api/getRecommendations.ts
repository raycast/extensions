import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetRecommendatons = {
  trackIds: string[];
  artistIds?: string[];
};

export async function getRecommendations({ trackIds, artistIds }: GetRecommendatons) {
  const { spotifyClient } = getSpotifyClient();
  try {
    const response = await spotifyClient.getRecommendations({
      seedTracks: trackIds.join(),
      seedArtists: artistIds?.join(),
    });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getRecommendations.ts Error:", error);
    throw new Error(error);
  }
}
