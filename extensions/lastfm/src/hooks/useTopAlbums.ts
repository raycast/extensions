import { useLastFm } from "./useLastFm";
import type { AlbumResponse, LastFmParams } from "@/types";

export const useTopAlbums = (params: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<AlbumResponse>("user.gettopalbums", params);
  return {
    albums: data?.topalbums?.album || [],
    loading,
    error,
    revalidate,
  };
};
