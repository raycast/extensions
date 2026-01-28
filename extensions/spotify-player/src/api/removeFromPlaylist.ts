import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type RemoveFromPlaylistProps = {
  playlistId: string;
  trackUris: {
    uri: string;
  }[];
};

export async function removeFromPlaylist({ playlistId, trackUris: tracks }: RemoveFromPlaylistProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.deletePlaylistsByPlaylistIdTracks(playlistId, {
      tracks,
    });
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("removeFromPlaylist.ts Error:", err);
    throw new Error(error);
  }
}
