import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetShowEpisodesProps = {
  showId: string;
  limit: number;
};

export async function getShowEpisodes({ showId, limit }: GetShowEpisodesProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getShowsByIdEpisodes(showId, { limit });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getShowEpisodes.ts Error:", error);
    throw new Error(error);
  }
}
