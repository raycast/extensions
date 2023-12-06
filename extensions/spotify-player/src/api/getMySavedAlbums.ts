import { getErrorMessage } from "../helpers/getError";
import { SimplifiedAlbumObject, SavedAlbumObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { iterateWithOffset } from "../helpers/spotifyIterator";

type GetMySavedAlbumsProps = { limit: number };

export async function* getMySavedAlbums({
  limit,
}: GetMySavedAlbumsProps): AsyncGenerator<
  { albums: SimplifiedAlbumObject[]; total: number; offset: number },
  void,
  unknown
> {
  const { spotifyClient } = getSpotifyClient();
  const iterator = iterateWithOffset<SavedAlbumObject>(limit, (input) => spotifyClient.getMeAlbums(input));
  try {
    for await (const { items, total, offset } of iterator) {
      const albums: SimplifiedAlbumObject[] = [];
      for (const albumItem of items ?? []) {
        if (albumItem?.album) {
          // Normalize the response to match the SimplifiedAlbumObject type
          // because the Spotify API returns a SavedAlbumObject type
          albums.push({
            ...albumItem.album,
            added_at: albumItem.added_at,
          } as SimplifiedAlbumObject);
        }
      }
      yield { albums, total, offset };
    }
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedAlbums.ts Error:", error);
    throw new Error(error);
  }
}
