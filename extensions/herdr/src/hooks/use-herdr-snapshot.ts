import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getSnapshot } from "../lib/herdr";
import { getRefreshIntervalMs } from "../lib/preferences";

export function useHerdrSnapshot() {
  // Aborting the in-flight snapshot on revalidate keeps refresh ticks from
  // stacking subprocesses behind a slow server.
  const abortable = useRef<AbortController>(null);
  const result = useCachedPromise(() => getSnapshot(abortable.current?.signal), [], {
    keepPreviousData: true,
    abortable,
  });
  const interval = getRefreshIntervalMs();

  useEffect(() => {
    const timer = setInterval(() => void result.revalidate(), interval);
    return () => clearInterval(timer);
  }, [interval, result.revalidate]);

  return result;
}
