import { useLastFm } from "./useLastFm";
import type { SongResponse, LastFmParams } from "@/types";

export const useTopTracks = (params: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<SongResponse>("user.gettoptracks", params);
  return {
    songs: data?.toptracks?.track || [],
    loading,
    error,
    revalidate,
  };
};
