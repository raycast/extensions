import { useCachedPromise } from "@raycast/utils";
import { getMyPlaylists } from "../api/getMyPlaylists";

type UseMyPlaylistsProps = {
  options?: {
    execute?: boolean;
  };
};

const fetchAllPlaylists = async () => {
  const allPlaylists = [];
  const limit = 50;
  let offset = 0;
  let total = 0;

  do {
    const playlists = await getMyPlaylists({
      offset,
      limit,
    });

    offset = playlists.offset + limit;
    total = playlists.total;

    if (playlists.items) {
      allPlaylists.push(...playlists.items);
    }
  } while (offset < total);

  return allPlaylists;
};

export function useMyPlaylists({ options }: UseMyPlaylistsProps = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => fetchAllPlaylists(), [], {
    execute: options?.execute !== false,
  });

  return {
    myPlaylistsData: data,
    myPlaylistsError: error,
    myPlaylistsIsLoading: isLoading,
    myPlaylistsRevalidate: revalidate,
  };
}
