import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function startRadio(trackUri: string) {
  const { spotifyClient } = getSpotifyClient();

  try {
    // Extract track ID from URI (format: spotify:track:id)
    const trackId = trackUri.split(":").pop();
    if (!trackId) {
      throw new Error("Invalid track URI format");
    }

    // Start radio by getting recommendations based on the track
    await spotifyClient.putMePlayerPlay({
      uris: undefined,
      context_uri: `spotify:station:track:${trackId}`,
    });
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("startRadio.ts Error:", error);
    throw new Error(error);
  }
}
