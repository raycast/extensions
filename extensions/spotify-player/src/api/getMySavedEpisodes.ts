import { getErrorMessage } from "../helpers/getError";
import { SimplifiedEpisodeObject, SavedEpisodeObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterate } from "../helpers/spotifyIterator";

type GetMySavedEpisodesProps = { limit: number };

export async function getMySavedEpisodes({ limit }: GetMySavedEpisodesProps) {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterate<SavedEpisodeObject>(limit, (input) => spotifyClient.getMeEpisodes(input));
  try {
    const episodes: SimplifiedEpisodeObject[] = [];
    for await (const items of iterator) {
      for (const showItem of items) {
        episodes.push({
          ...showItem.episode,
        } as SimplifiedEpisodeObject);
      }
    }
    return { items: episodes };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedEpisodes.ts Error:", error);
    throw new Error(error);
  }
}
