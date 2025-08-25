import { useLastFm } from "./useLastfm";
import type { ArtistResponse, LastFmParams } from "@/types";

export const useTopArtists = (params: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<ArtistResponse>("user.gettopartists", params);
  return {
    artists: data?.topartists?.artist || [],
    loading,
    error,
    revalidate,
  };
};
