import { useCachedPromise } from "@raycast/utils";
import { search } from "../api/search";
import { AlbumDetailed, ArtistDetailed, PlaylistDetailed, SongDetailed, VideoDetailed } from "ytmusic-api";
import { SearchDropdownList } from "../types";

let currentRequestId = 0;

export const useSearch = (query: string, filterBy: SearchDropdownList["value"]) => {
  const { data, isLoading, error } = useCachedPromise(
    async (query: string, filterBy: SearchDropdownList["value"]) => {
      const requestId = ++currentRequestId;

      const result = await search(query, filterBy);

      if (requestId === currentRequestId) {
        return result;
      }
      return null;
    },
    [query, filterBy],
    {
      keepPreviousData: true,
      execute: !!query,
    },
  );

  const tracks = data?.filter((item) => item.type == "SONG") as unknown as SongDetailed[];
  const albums = data?.filter((item) => item.type == "ALBUM") as unknown as AlbumDetailed[];
  const artists = data?.filter((item) => item.type == "ARTIST") as unknown as ArtistDetailed[];
  const videos = data?.filter((item) => item.type == "VIDEO") as unknown as VideoDetailed[];
  const playlists = data?.filter((item) => item.type == "PLAYLIST") as unknown as PlaylistDetailed[];

  return {
    searchData: {
      tracks,
      albums,
      artists,
      videos,
      playlists,
    },
    searchError: error,
    searchIsLoading: isLoading,
  };
};
