import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { systemDf, systemStatus } from "../lib/container";
import { useAutoRefresh } from "./useAutoRefresh";

export function useSystemStatus() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const result = useCachedPromise(() => systemStatus(abortable.current?.signal), [], {
    abortable,
    keepPreviousData: true,
  });
  useAutoRefresh(result.revalidate);
  return result;
}

export function useSystemDf() {
  const abortable = useRef<AbortController | undefined>(undefined);
  return useCachedPromise(() => systemDf(abortable.current?.signal), [], { abortable, keepPreviousData: true });
}
