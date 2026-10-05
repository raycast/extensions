import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { inspectContainer, listContainers } from "../lib/container";
import type { RawContainer } from "../lib/types";
import { useAutoRefresh } from "./useAutoRefresh";

export function useContainers(showAll: boolean) {
  const abortable = useRef<AbortController | undefined>(undefined);
  const result = useCachedPromise((all: boolean) => listContainers(all, abortable.current?.signal), [showAll], {
    initialData: [] as RawContainer[],
    abortable,
    keepPreviousData: true,
  });
  useAutoRefresh(result.revalidate);
  return result;
}

export function useContainerInspect(id: string) {
  const abortable = useRef<AbortController | undefined>(undefined);
  const result = useCachedPromise(
    (containerId: string) => inspectContainer(containerId, abortable.current?.signal),
    [id],
    { abortable, keepPreviousData: true },
  );
  useAutoRefresh(result.revalidate);
  return result;
}
