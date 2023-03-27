import { useCachedPromise } from "@raycast/utils";
import { getUserPlaylists } from "../api/getUserPlaylists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedTracks } from "../api/getMySavedTracks";
import { getMySavedShows } from "../api/getMySavedShows";

type UseMyLibraryProps = {
  options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
  };
};

export function useYourLibrary({ options }: UseMyLibraryProps) {
  const {
    data = [],
    error,
    isLoading,
  } = useCachedPromise(
    () =>
      Promise.all([
        getUserPlaylists({ limit: 50 }),
        getMySavedAlbums({ limit: 50 }),
        getFollowedArtists({ limit: 50 }),
        getMySavedTracks({ limit: 50 }),
        getMySavedShows({ limit: 24 }),
      ]),
    [],
    {
      keepPreviousData: options?.keepPreviousData,
    }
  );

  const [playlistsData, albumsData, artistsData, tracksData, showsData] = data;

  return {
    myLibraryData: {
      playlists: playlistsData,
      albums: albumsData,
      artists: artistsData,
      tracks: tracksData,
      shows: showsData,
    },
    myLibraryError: error,
    myLibraryIsLoading: isLoading,
  };
}
