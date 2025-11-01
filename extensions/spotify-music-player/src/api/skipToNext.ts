import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToNext() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerNext();
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("skipToNext.ts Error:", error);
    throw new Error(error);
  }
}
