import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetUserPlaylistsProps = { limit?: number };

export async function getUserPlaylists({ limit = 50 }: GetUserPlaylistsProps = {}) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMePlaylists({ limit });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getUserPlaylists.ts Error:", error);
    throw new Error(error);
  }
}
