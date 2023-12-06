import { getErrorMessage } from "../helpers/getError";
import { SimplifiedShowObject, SavedShowObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterate } from "../helpers/spotifyIterator";

type GetMySavedShowsProps = { limit: number };

export async function getMySavedShows({ limit }: GetMySavedShowsProps) {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterate<SavedShowObject>(limit, (input) => spotifyClient.getMeShows(input));
  try {
    const shows: SimplifiedShowObject[] = [];
    for await (const items of iterator) {
      for (const showItem of items) {
        shows.push({
          ...showItem.show,
        } as SimplifiedShowObject);
      }
    }
    return { items: shows };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedShows.ts Error:", error);
    throw new Error(error);
  }
}
