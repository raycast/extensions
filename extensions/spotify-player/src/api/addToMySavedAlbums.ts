import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type addToMySavedAlbumsProps = {
  albumIds: string[];
};

export async function addToMySavedAlbums({ albumIds }: addToMySavedAlbumsProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.putMeAlbums(albumIds.join());
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("addToMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
