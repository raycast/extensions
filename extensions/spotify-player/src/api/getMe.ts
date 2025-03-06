import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMe() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMe();
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMe.ts Error:", error);
    throw new Error(error);
  }
}
