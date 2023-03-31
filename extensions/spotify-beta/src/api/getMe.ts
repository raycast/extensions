import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export async function getMe() {
  const { spotifyClient } = getSpotifyClient();

  try {
    console.log("Calling the Spotify API...");
    const response = await spotifyClient.getMe();
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getArtistTopTracks.ts Error:", error);
    throw new Error(error);
  }
}
