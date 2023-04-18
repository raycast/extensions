import { getErrorMessage } from "../helpers/getError";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedEpisodesProps = { limit?: number };

export async function getMySavedEpisodes({ limit = 50 }: GetMySavedEpisodesProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeEpisodes({ limit });

    // Normalize the response to match the SimplifiedEpisodeObject type
    // because the Spotify API returns a SavedEpisodeObject type
    const shows = (response?.items ?? []).map((episodeItem) => {
      return {
        ...episodeItem.episode,
      };
    });

    return { items: shows as SimplifiedEpisodeObject[] };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedEpisodes.ts Error:", error);
    throw new Error(error);
  }
}
