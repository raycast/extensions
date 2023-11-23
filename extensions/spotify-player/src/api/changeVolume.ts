import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function changeVolume(volume: number) {
  const { spotifyClient } = getSpotifyClient();

  try {
    await spotifyClient.putMePlayerVolume(volume);
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("changeVolume.ts Error:", error);
    throw new Error(error);
  }
}
