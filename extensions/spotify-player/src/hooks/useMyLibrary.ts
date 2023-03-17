import { useCachedPromise } from "@raycast/utils";
import { getUserPlaylists } from "../api/getUserPlaylists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedTracks } from "../api/getMySavedTracks";

type UseMyLibraryProps = {
  options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
  };
};

export function useMyLibrary({ options }: UseMyLibraryProps) {
  const {
    data = [],
    error,
    isLoading,
  } = useCachedPromise(
    () =>
      Promise.all([
        getUserPlaylists({ limit: 24 }),
        getMySavedAlbums({ limit: 24 }),
        getFollowedArtists({ limit: 24 }),
        getMySavedTracks({ limit: 50 }),
      ]),
    [],
    {
      keepPreviousData: options?.keepPreviousData,
    }
  );

  const [playlistData, albumData, artistsData, tracksData] = data;

  const playlists = playlistData;
  const artists = artistsData?.artists;

  let albums: SpotifyApi.AlbumSearchResponse["albums"] | undefined = undefined;

  if (albumData) {
    albums = {
      ...albumData,
      items: albumData.items.map((album) => ({ ...album, ...album.album })),
    };
  }

  let tracks: SpotifyApi.TrackSearchResponse["tracks"] | undefined = undefined;

  if (tracksData) {
    tracks = {
      ...tracksData,
      items: tracksData.items.map((track) => ({ ...track, ...track.track })),
    };
  }

  return {
    myLibraryData: { playlists, artists, albums, tracks },
    myLibraryError: error,
    myLibraryIsLoading: isLoading,
  };
}
