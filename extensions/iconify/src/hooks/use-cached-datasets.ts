import { usePromise } from "@raycast/utils";
import { cache, isExpired } from "../utils";
import { DataSet } from "../types";
import { useRef } from "react";
import { listSets } from "../api/service";

export const useCachedDataSets = () => {
  const abortable = useRef<AbortController>(new AbortController());

  const { isLoading, data } = usePromise(
    async () => {
      const cacheId = "sets";
      const cached = cache.get(cacheId);
      if (cached) {
        try {
          const { time, data }: { time: number; data: DataSet[] } = JSON.parse(cached);
          if (!isExpired(time)) return data;
        } catch (e) {
          console.log("Couldn't parse cache: ", e);
        }
      }
      const data = await listSets(abortable.current.signal);
      cache.set(cacheId, JSON.stringify({ time: Date.now(), data }));
      return data;
    },
    [],
    {
      failureToastOptions: {
        title: "Couldn't fetch icon sets",
      },
      abortable,
    },
  );
  return {
    isLoading,
    data: data ?? [],
  };
};
