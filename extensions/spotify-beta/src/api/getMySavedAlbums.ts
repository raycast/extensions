import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

type GetMySavedAlbumsProps = { limit?: number };

export async function getMySavedAlbums({ limit = 50 }: GetMySavedAlbumsProps = {}) {
  const { spotifyClient } = getSpotifyClient();
  const response = await spotifyClient.getMeAlbums({ limit });

  // Normalize the response to match the SimplifiedAlbumObject type
  // because the Spotify API returns a SavedAlbumObject type
  const albums = (response?.items ?? []).map((albumItem) => {
    return {
      ...albumItem.album,
    };
  });

  return { items: albums as SimplifiedAlbumObject[] };
}
