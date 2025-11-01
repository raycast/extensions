import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function startRadio(trackUri: string) {
  const { spotifyClient } = getSpotifyClient();

  try {
    // Start radio by getting recommendations based on the track
    await spotifyClient.putMePlayerPlay({
      uris: undefined,
      context_uri: `spotify:station:track:${trackUri.split(":").pop()}`,
    });
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("startRadio.ts Error:", error);
    throw new Error(error);
  }
}
