import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Episode, getEpisodes } from "../feed-parser";

export const useEpisodesFetch = (feed: string) => {
  const [data, setData] = useState<Episode[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const episodes = await getEpisodes(feed);
        setData(episodes);
      } catch (err) {
        setError(err as Error);
      }
      setIsLoading(false);
    })();
  }, [feed]);

  return { data, error, isLoading };
};

export const useEpisodes = (feed: string) => {
  return useCachedPromise(getEpisodes, [feed]);
};
