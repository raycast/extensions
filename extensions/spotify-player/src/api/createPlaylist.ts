import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type CreatePlaylistProps = {
  name: string;
  description: string;
};

export async function createPlaylist({ name, description }: CreatePlaylistProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const me = await spotifyClient.getMe();

    const userId = me.id;
    if (userId) {
      const playlistResponse = await spotifyClient.postUsersByUserIdPlaylists(userId, { name, description });

      return playlistResponse;
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("createPlaylist.ts Error:", error);
    throw new Error(error);
  }
}
