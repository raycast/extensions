import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { listVolumes } from "../lib/container";
import type { RawVolume } from "../lib/types";
import { useAutoRefresh } from "./useAutoRefresh";

export function useVolumes() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const result = useCachedPromise(() => listVolumes(abortable.current?.signal), [], {
    initialData: [] as RawVolume[],
    abortable,
    keepPreviousData: true,
  });
  useAutoRefresh(result.revalidate);
  return result;
}
