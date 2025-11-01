import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function toggleRepeat(state: "track" | "context" | "off") {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.putMePlayerRepeat(state);
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("toggleRepeat.ts Error:", error);
    throw new Error(error);
  }
}
