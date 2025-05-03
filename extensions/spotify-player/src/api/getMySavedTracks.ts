import { getErrorMessage } from "../helpers/getError";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedTracksProps = { limit?: number };

export async function getMySavedTracks({ limit = 50 }: GetMySavedTracksProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeTracks({ limit });

    // Normalize the response to match the SimplifiedTrackObject type
    // because the Spotify API returns a SavedTrackObject type
    const tracks = (response?.items ?? []).map((trackItem) => {
      return {
        ...trackItem.track,
      };
    });

    return { items: tracks as SimplifiedTrackObject[], total: response?.total ?? 0 };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
