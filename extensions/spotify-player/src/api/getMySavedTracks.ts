import { getErrorMessage } from "../helpers/getError";
import { SimplifiedTrackObject, SavedTrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterate } from "../helpers/spotifyIterator";

type GetMySavedTracksProps = { limit: number };

export async function getMySavedTracks({ limit }: GetMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterate<SavedTrackObject>(limit, (input) => spotifyClient.getMeTracks(input));
  try {
    const episodes: SimplifiedTrackObject[] = [];
    for await (const items of iterator) {
      for (const showItem of items) {
        episodes.push({
          ...showItem.track,
        } as SimplifiedTrackObject);
      }
    }
    return { items: episodes, total: episodes.length };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
