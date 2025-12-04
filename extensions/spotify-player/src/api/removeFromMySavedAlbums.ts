import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type RemoveFromMySavedAlbumsProps = {
  albumIds: string[];
};

export async function removeFromMySavedAlbums({ albumIds }: RemoveFromMySavedAlbumsProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.deleteMeAlbums(albumIds.join());
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("removeFromMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
