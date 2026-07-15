import { useCachedPromise } from "@raycast/utils";
import { getUserPlaylists } from "../api/getUserPlaylists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedTracks } from "../api/getMySavedTracks";
import { getMySavedShows } from "../api/getMySavedShows";
import { getMySavedEpisodes } from "../api/getMySavedEpisodes";

export type LibraryCategory = "all" | "playlists" | "albums" | "artists" | "tracks" | "shows" | "episodes";

type UseMyLibraryProps = {
  category?: LibraryCategory;
  keepPreviousData?: boolean;
};

type LibraryData = {
  playlists?: Awaited<ReturnType<typeof getUserPlaylists>>;
  albums?: Awaited<ReturnType<typeof getMySavedAlbums>>;
  artists?: Awaited<ReturnType<typeof getFollowedArtists>>;
  tracks?: Awaited<ReturnType<typeof getMySavedTracks>>;
  shows?: Awaited<ReturnType<typeof getMySavedShows>>;
  episodes?: Awaited<ReturnType<typeof getMySavedEpisodes>>;
};

async function fetchLibraryData(category: LibraryCategory): Promise<LibraryData> {
  if (category === "all") {
    const [playlists, albums, artists, tracks, shows, episodes] = await Promise.all([
      getUserPlaylists(),
      getMySavedAlbums(),
      getFollowedArtists(),
      getMySavedTracks(),
      getMySavedShows(),
      getMySavedEpisodes(),
    ]);
    return { playlists, albums, artists, tracks, shows, episodes };
  }

  const fetchers: Record<Exclude<LibraryCategory, "all">, () => Promise<LibraryData>> = {
    playlists: async () => ({ playlists: await getUserPlaylists() }),
    albums: async () => ({ albums: await getMySavedAlbums() }),
    artists: async () => ({ artists: await getFollowedArtists() }),
    tracks: async () => ({ tracks: await getMySavedTracks() }),
    shows: async () => ({ shows: await getMySavedShows() }),
    episodes: async () => ({ episodes: await getMySavedEpisodes() }),
  };

  return fetchers[category]();
}

export function useYourLibrary(options: UseMyLibraryProps = {}) {
  const category = options.category ?? "all";
  const { data, error, isLoading } = useCachedPromise(fetchLibraryData, [category], {
    keepPreviousData: options?.keepPreviousData,
  });

  return {
    myLibraryData: {
      playlists: data?.playlists,
      albums: data?.albums,
      artists: data?.artists,
      tracks: data?.tracks,
      shows: data?.shows,
      episodes: data?.episodes,
    },
    myLibraryError: error,
    myLibraryIsLoading: isLoading,
  };
}
