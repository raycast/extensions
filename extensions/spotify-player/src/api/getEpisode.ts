import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getEpisode(episodeId: string) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getEpisodesById(episodeId);
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getEpisode.ts Error:", error);
    throw new Error(error);
  }
}
