import { useCallback, useRef } from "react";

import { useCachedPromise } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { testMirror } from "@/utils/api/mirrors";

interface Timings {
  startTime: number;
  endTime: number;
}

export function useTimingFetch(baseUrl: string): UseCachedPromiseReturnType<Timings, null> {
  const abortable = useRef<AbortController>(undefined);

  const fn = useCallback((baseUrl: string) => testMirror(baseUrl, abortable.current?.signal), []);

  return useCachedPromise(fn, [baseUrl], { abortable });
}
