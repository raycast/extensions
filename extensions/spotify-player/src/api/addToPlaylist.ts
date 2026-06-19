import { invalidateCache } from "../helpers/apiCache";
import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type AddToMyPlaylistProps = {
  playlistId: string;
  trackUris: string[];
};

export async function addToPlaylist({ playlistId, trackUris }: AddToMyPlaylistProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.postPlaylistsByPlaylistIdTracks(playlistId, { uris: trackUris });
    invalidateCache("api:playlists", "api:user-playlists");
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("addToPlaylist.ts Error:", error);
    throw new Error(error);
  }
}
