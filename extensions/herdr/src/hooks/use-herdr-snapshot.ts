import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getSnapshot } from "../lib/herdr";
import { getRefreshIntervalMs } from "../lib/preferences";

export function useHerdrSnapshot() {
  const result = useCachedPromise(getSnapshot, [], { keepPreviousData: true });
  const interval = getRefreshIntervalMs();

  useEffect(() => {
    const timer = setInterval(() => void result.revalidate(), interval);
    return () => clearInterval(timer);
  }, [interval, result.revalidate]);

  return result;
}
