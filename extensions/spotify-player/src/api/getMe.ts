import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { withRetry } from "../helpers/withRetry";

export async function getMe() {
  return withRetry(async () => {
    const { spotifyClient } = getSpotifyClient();

    try {
      const response = await spotifyClient.getMe();
      return response;
    } catch (err) {
      const error = getErrorMessage(err);
      console.log("getMe.ts Error:", error);
      throw new Error(error);
    }
  });
}
