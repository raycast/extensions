import { useCachedPromise } from "@raycast/utils";
import { getUserPlaylists } from "../api/getUserPlaylists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedShows } from "../api/getMySavedShows";
import { getMySavedEpisodes } from "../api/getMySavedEpisodes";
import { useMySavedTracks } from "./useMySavedTracks";
import { useCallback } from "react";
import {
  SimplifiedPlaylistObject,
  SimplifiedAlbumObject,
  ArtistObject,
  SimplifiedShowObject,
  SimplifiedEpisodeObject,
} from "../helpers/spotify.api";
import { MinimalTrack } from "../api/getMySavedTracks";

interface LibraryData {
  playlists?: {
    items?: SimplifiedPlaylistObject[];
  };
  albums?: {
    items: SimplifiedAlbumObject[];
  };
  artists?: {
    items?: ArtistObject[];
  };
  tracks?: {
    items: MinimalTrack[];
    total: number;
    hasMore: boolean;
  };
  shows?: {
    items: SimplifiedShowObject[];
  };
  episodes?: {
    items: SimplifiedEpisodeObject[];
  };
}

type UseMyLibraryProps = {
  execute?: boolean;
  keepPreviousData?: boolean;
};

export function useYourLibrary(options: UseMyLibraryProps = {}) {
  const {
    savedTracksData: tracksData,
    savedTracksIsLoading: tracksLoading,
    fetchProgress: tracksFetchProgress,
    revalidate: revalidateTracks,
  } = useMySavedTracks({
    fetchAll: true,
    options: {
      execute: options.execute !== false,
      keepPreviousData: options.keepPreviousData,
    },
  });

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchLibraryData = useCallback(async () => {
    const [playlists, albums, artists, shows, episodes] = await Promise.all([
      getUserPlaylists(),
      getMySavedAlbums(),
      getFollowedArtists(),
      getMySavedShows(),
      getMySavedEpisodes(),
    ]);
    return [playlists, albums, artists, shows, episodes] as const;
  }, []);

  const {
    data = [],
    error,
    isLoading,
    revalidate: revalidateLibrary,
  } = useCachedPromise(fetchLibraryData, [], {
    keepPreviousData: options.keepPreviousData,
    // Only execute after tracks are loaded
    execute: options.execute !== false && !tracksLoading,
  });

  const [playlistsData, albumsData, artistsData, showsData, episodesData] = data;

  const myLibraryData: LibraryData = {
    playlists: playlistsData,
    albums: albumsData,
    artists: artistsData,
    tracks: tracksData
      ? {
          items: tracksData.items,
          total: tracksData.total,
          hasMore: false,
        }
      : undefined,
    shows: showsData,
    episodes: episodesData,
  };

  const revalidate = useCallback(async () => {
    await Promise.all([revalidateTracks(), revalidateLibrary()]);
  }, [revalidateTracks, revalidateLibrary]);

  return {
    myLibraryData,
    myLibraryError: error,
    myLibraryIsLoading: isLoading || tracksLoading,
    tracksFetchProgress,
    revalidate,
  };
}
