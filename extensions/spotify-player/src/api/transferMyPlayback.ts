import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function transferMyPlayback(deviceId: string, play?: boolean) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.putMePlayer({ device_ids: [deviceId], play });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("transferMyPlayback.ts Error:", error);
    throw new Error(error);
  }
}
