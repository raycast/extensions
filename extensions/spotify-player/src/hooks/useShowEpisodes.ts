import { useCachedPromise } from "@raycast/utils";
import { getShowEpisodes } from "../api/getShowEpisodes";

type UseShowEpisodesProps = {
  showId?: string;
  limit?: number;
  options?: {
    execute?: boolean;
  };
};

export function useShowEpisodes({ showId = "", limit = 50, options }: UseShowEpisodesProps) {
  const { data, error, isLoading } = useCachedPromise(
    (showId: string, limit: number) => getShowEpisodes({ showId, limit }),
    [showId, limit],
    {
      execute: options?.execute !== false && !!showId && !!limit,
    },
  );

  return { showEpisodesData: data, showEpisodesError: error, showEpisodesIsLoading: isLoading };
}
