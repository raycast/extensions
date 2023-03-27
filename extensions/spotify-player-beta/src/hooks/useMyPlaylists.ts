import { useCachedPromise } from "@raycast/utils";
import { getMyPlaylists } from "../api/getMyPlaylists";

type UseMyPlaylistsProps = {
  options?: {
    execute?: boolean;
  };
};

export function useMyPlaylists({ options }: UseMyPlaylistsProps = {}) {
  const { data, error, isLoading } = useCachedPromise(() => getMyPlaylists(), [], {
    execute: options?.execute !== false,
  });

  return { myPlaylistsData: data, myPlaylistsError: error, myPlaylistsIsLoading: isLoading };
}
