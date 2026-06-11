import { withCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

async function _getMyDevices() {
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

export const getMyDevices = withCache("api:devices", 30000, _getMyDevices);
