import type { RequestInfo } from "node-fetch";
import fetch from "node-fetch";
import { useCallback, useRef } from "react";

import { useCachedPromise } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

interface Timings {
  startTime: number;
  endTime: number;
}

export function useTimingFetch(url: RequestInfo): UseCachedPromiseReturnType<Timings, null> {
  const abortable = useRef<AbortController>(undefined);
  const startTime = useRef<number>(undefined);
  const endTime = useRef<number>(undefined);

  const fn = useCallback(async (url: RequestInfo) => {
    startTime.current = Date.now();
    await fetch(url, { signal: abortable.current?.signal, method: "HEAD" });
    endTime.current = Date.now();
    return { startTime: startTime.current, endTime: endTime.current };
  }, []);

  return useCachedPromise(fn, [url], { abortable });
}
