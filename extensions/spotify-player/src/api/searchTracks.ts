import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function searchTracks(query: string, limit: number) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.search(query, ["track"], { limit });
    return response.tracks;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("searchTracks.ts Error:", error);
    throw new Error(error);
  }
}
