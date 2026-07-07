/**
 * Data-fetching hooks shared by every command. `useApi` wraps the token-aware
 * `api()` client in `useCachedPromise` (stale-while-revalidate + cross-launch
 * cache). `usePolling` drives the periodic `revalidate()` the dashboard does via
 * `setInterval` for its near-real-time views (device health, capture, sessions).
 */
import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { api } from "./api";

export function useApi<T>(
  path: string,
  options?: { execute?: boolean; keepPreviousData?: boolean; initialData?: T },
) {
  return useCachedPromise((p: string) => api<T>(p), [path], {
    keepPreviousData: true,
    ...options,
  });
}

/** Call `revalidate` every `intervalMs` while `active`. A no-op when inactive or interval ≤ 0. */
export function usePolling(
  revalidate: () => void,
  intervalMs: number,
  active = true,
): void {
  useEffect(() => {
    if (!active || intervalMs <= 0) return;
    const id = setInterval(revalidate, intervalMs);
    return () => clearInterval(id);
  }, [revalidate, intervalMs, active]);
}
