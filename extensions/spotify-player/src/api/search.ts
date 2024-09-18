import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type SearchProps = { query: string; limit?: number };

export async function search({ query, limit = 50 }: SearchProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.search(query, ["track", "artist", "album", "playlist", "show", "episode"], {
      limit,
    });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("search.ts Error:", error);
    throw new Error(error);
  }
}
