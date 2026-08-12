import { withCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

async function _getMe() {
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

export const getMe = withCache("api:me", 3600000, _getMe);
