import { getErrorMessage } from "../helpers/getError";
import { SimplifiedTrackObject, SavedTrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterateWithOffset } from "../helpers/spotifyIterator";

type GetMySavedTracksProps = { limit: number };

export async function* getMySavedTracks({
  limit,
}: GetMySavedTracksProps): AsyncGenerator<
  { tracks: SimplifiedTrackObject[]; total: number; offset: number },
  void,
  unknown
> {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterateWithOffset<SavedTrackObject>(limit, (input) => spotifyClient.getMeTracks(input));
  try {
    for await (const { items, total, offset } of iterator) {
      const tracks: SimplifiedTrackObject[] = [];
      for (const trackItem of items ?? []) {
        // Normalize the response to match the SimplifiedTrackObject type
        // because the Spotify API returns a SavedTrackObject type
        tracks.push({
          ...trackItem.track,
          added_at: trackItem.added_at,
        } as SimplifiedTrackObject);
      }
      yield { tracks, total, offset };
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
