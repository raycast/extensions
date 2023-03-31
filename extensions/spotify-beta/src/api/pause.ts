import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function pause() {
  const { spotifyClient } = getSpotifyClient();
  try {
    await spotifyClient.putMePlayerPause();
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("pause.ts Error: ", error);
    throw new Error(error);
  }
}
