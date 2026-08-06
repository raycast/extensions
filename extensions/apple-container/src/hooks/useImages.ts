import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { listImages } from "../lib/container";
import type { RawImage } from "../lib/types";
import { useAutoRefresh } from "./useAutoRefresh";

export function useImages() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const result = useCachedPromise(() => listImages(abortable.current?.signal), [], {
    initialData: [] as RawImage[],
    abortable,
    keepPreviousData: true,
  });
  useAutoRefresh(result.revalidate);
  return result;
}
