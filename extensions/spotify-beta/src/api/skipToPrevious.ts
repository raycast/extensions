import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function skipToPrevious() {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.postMePlayerPrevious();
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("skipToPrevious.ts Error:", error);
    throw new Error(error);
  }
}
