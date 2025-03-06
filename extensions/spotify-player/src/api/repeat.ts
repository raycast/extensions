import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function repeat(state: "track" | "context" | "off") {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.putMePlayerRepeat(state);
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("repeat.ts Error:", error);
    throw new Error(error);
  }
}
