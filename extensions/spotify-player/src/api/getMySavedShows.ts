import { withCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { SimplifiedShowObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedShowsProps = { limit?: number };

async function _getMySavedShows({ limit = 50 }: GetMySavedShowsProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeShows({ limit });

    // Normalize the response to match the SimplifiedShowObject type
    // because the Spotify API returns a SavedShowObject type
    const shows = (response?.items ?? []).map((showItem) => {
      return {
        ...showItem.show,
      };
    });

    return { items: shows as SimplifiedShowObject[] };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedShows.ts Error:", error);
    throw new Error(error);
  }
}

export const getMySavedShows = withCache("api:library:shows", 300000, _getMySavedShows);
