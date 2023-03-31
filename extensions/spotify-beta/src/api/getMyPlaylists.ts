import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedAlbumsProps = { limit?: number };

export async function getMyPlaylists({ limit = 50 }: GetMySavedAlbumsProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    console.log("Calling the Spotify API...");
    const response = await spotifyClient.getMePlaylists({ limit });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMyPlaylists.ts Error:", error);
    throw new Error(error);
  }
}
