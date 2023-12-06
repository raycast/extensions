import { getErrorMessage } from "../helpers/getError";
import { SimplifiedEpisodeObject, SavedEpisodeObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterateWithOffset } from "../helpers/spotifyIterator";

type GetMySavedEpisodesProps = { limit: number };

export async function* getMySavedEpisodes({
  limit,
}: GetMySavedEpisodesProps): AsyncGenerator<
  { episodes: SimplifiedEpisodeObject[]; total: number; offset: number },
  void,
  unknown
> {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterateWithOffset<SavedEpisodeObject>(limit, (input) => spotifyClient.getMeEpisodes(input));
  try {
    for await (const { items, total, offset } of iterator) {
      const episodes: SimplifiedEpisodeObject[] = [];
      for (const episodeItem of items ?? []) {
        // Normalize the response to match the SimplifiedEpisodeObject type
        // because the Spotify API returns a SavedEpisodeObject type
        episodes.push({
          ...episodeItem.episode,
          added_at: episodeItem.added_at,
        } as SimplifiedEpisodeObject);
      }
      yield { episodes, total, offset };
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedEpisodes.ts Error:", error);
    throw new Error(error);
  }
}
