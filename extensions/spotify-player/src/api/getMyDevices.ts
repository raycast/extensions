import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMyDevices() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlayerDevices();
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMyDevices.ts Error:", error);
    throw new Error(error);
  }
}
