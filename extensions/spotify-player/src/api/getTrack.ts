import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getTrack(trackId: string) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getTracksById(trackId);
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getTrack.ts Error:", error);
    throw new Error(error);
  }
}
