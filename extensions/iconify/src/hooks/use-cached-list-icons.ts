import { usePromise } from "@raycast/utils";
import { DataIcon, DataSet } from "../types";
import { getCacheValue } from "../utils/cache";
import { listIcons } from "../api/service";
import { useRef } from "react";

export const useCachedListIcons = (set?: DataSet) => {
  //@ts-expect-error React issue, this works fine
  const abortable = useRef<AbortController>();
  const { data, ...rest } = usePromise(
    async (set?: DataSet) => {
      if (!set) return [];
      const cacheId = `set-${set.id}`;
      const cached = getCacheValue<DataIcon>(cacheId);

      if (cached.useCache) {
        return cached.data;
      }

      const data = await listIcons(set.id, set.name, abortable?.current?.signal);
      cached.setCache(data);
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
    ...rest,
    data: data ?? [],
  };
};
