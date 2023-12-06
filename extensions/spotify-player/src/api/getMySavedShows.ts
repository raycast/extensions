import { getErrorMessage } from "../helpers/getError";
import { SimplifiedShowObject, SavedShowObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterateWithOffset } from "../helpers/spotifyIterator";

type GetMySavedShowsProps = { limit: number };

export async function* getMySavedShows({
  limit,
}: GetMySavedShowsProps): AsyncGenerator<
  { shows: SimplifiedShowObject[]; total: number; offset: number },
  void,
  unknown
> {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterateWithOffset<SavedShowObject>(limit, (input) => spotifyClient.getMeShows(input));
  try {
    for await (const { items, total, offset } of iterator) {
      const shows: SimplifiedShowObject[] = [];
      for (const showItem of items ?? []) {
        // Normalize the response to match the SimplifiedShowObject type
        // because the Spotify API returns a SavedShowObject type
        shows.push({
          ...showItem.show,
          added_at: showItem.added_at,
        } as SimplifiedShowObject);
      }
      yield { shows, total, offset };
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedShows.ts Error:", error);
    throw new Error(error);
  }
}
