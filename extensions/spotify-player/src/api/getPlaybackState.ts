import { getErrorMessage } from "../helpers/getError";
import { CurrentlyPlayingContextObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getPlaybackState() {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlayer({ additionalTypes: "episode" });
    // Type is coming back as `unknown` for some reason
    return response as CurrentlyPlayingContextObject;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getPlaybackState.ts Error:", error);
    throw new Error(error);
  }
}
