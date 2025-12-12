import { usePromise } from "@raycast/utils";
import { DataIcon, DataSet } from "../types";
import { cache, isExpired } from "../utils";
import { listIcons } from "../api/service";
import { useRef } from "react";

export const useCachedListIcons = (set?: DataSet) => {
  const abortable = useRef<AbortController>(new AbortController());
  const { isLoading, data } = usePromise(
    async (set?: DataSet) => {
      if (!set) return [];
      const cacheId = `set-${set.id}`;
      const cached = cache.get(cacheId);
      if (cached) {
        try {
          const { time, data }: { time: number; data: DataIcon[] } = JSON.parse(cached);
          if (!isExpired(time)) return data;
        } catch (e) {
          console.log("Couldn't parse cache: ", e);
        }
      }
      const data = await listIcons(set.id, set.name, abortable.current.signal);
      cache.set(cacheId, JSON.stringify({ time: Date.now(), data }));
      return data;
    },
    [set],
    {
      failureToastOptions: {
        title: "Couldn't fetch icons",
      },
      abortable,
    },
  );
  return {
    isLoading,
    data: data ?? [],
  };
};
