import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function shuffle(state: boolean) {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.putMePlayerShuffle(state);
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("shuffle.ts Error:", error);
    throw new Error(error);
  }
}
