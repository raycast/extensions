import { useLastFm } from "./useLastFm";
import type { SongResponse, LastFmParams } from "@/types";

export const useRecentTracks = (params?: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<SongResponse>("user.getrecenttracks", params);
  return {
    songs: data?.recenttracks?.track || [],
    loading,
    error,
    revalidate,
  };
};
