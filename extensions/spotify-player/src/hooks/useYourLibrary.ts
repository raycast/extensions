import { useCachedPromise } from "@raycast/utils";
import { getUserPlaylists } from "../api/getUserPlaylists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedTracks } from "../api/getMySavedTracks";
import { getMySavedShows } from "../api/getMySavedShows";
import { getMySavedEpisodes } from "../api/getMySavedEpisodes";

type UseMyLibraryProps = {
  execute?: boolean;
  keepPreviousData?: boolean;
};

export function useYourLibrary(options: UseMyLibraryProps = {}) {
  const {
    data = [],
    error,
    isLoading,
  } = useCachedPromise(
    () =>
      Promise.all([
        getUserPlaylists(),
        getMySavedAlbums(),
        getFollowedArtists(),
        getMySavedTracks(),
        getMySavedShows(),
        getMySavedEpisodes(),
      ]),
    [],
    {
      keepPreviousData: options?.keepPreviousData,
    },
  );

  const [playlistsData, albumsData, artistsData, tracksData, showsData, episodesData] = data;

  return {
    myLibraryData: {
      playlists: playlistsData,
      albums: albumsData,
      artists: artistsData,
      tracks: tracksData,
      shows: showsData,
      episodes: episodesData,
    },
    myLibraryError: error,
    myLibraryIsLoading: isLoading,
  };
}
