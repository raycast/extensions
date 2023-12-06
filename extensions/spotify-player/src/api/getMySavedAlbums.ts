import { getErrorMessage } from "../helpers/getError";
import { SimplifiedAlbumObject, SavedAlbumObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterate } from "../helpers/spotifyIterator";

type GetMySavedAlbumsProps = { limit: number };

export async function getMySavedAlbums({ limit }: GetMySavedAlbumsProps) {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterate<SavedAlbumObject>(limit, (input) => spotifyClient.getMeAlbums(input));
  try {
    const albums: SimplifiedAlbumObject[] = [];
    for await (const items of iterator) {
      for (const albumItem of items) {
        albums.push({
          ...albumItem.album,
        } as SimplifiedAlbumObject);
      }
    }
    return { items: albums };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedAlbums.ts Error:", error);
    throw new Error(error);
  }
}
