import { getErrorMessage } from "../helpers/getError";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type ContainsMySavedAlbum = {
  albumId: string;
};

export async function containsMySavedAlbum({ albumId }: ContainsMySavedAlbum) {
  const { spotifyClient } = getSpotifyClient();

  try {
    const response = await spotifyClient.getMeAlbumsContains(albumId);
    return response;
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("containsMySavedAlbum.ts Error:", error);
    throw new Error(error);
  }
}
