import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import { cacheClear } from "./cache";
import { ACTIVITY_WINDOW_DAYS, loadActivities, loadConnections, loadPortfolio } from "./data";
import { authMode } from "./preferences";

/** Portfolio snapshot with Raycast-level caching (instant paint) plus our HTTP TTL cache. */
export function usePortfolio() {
  const mode = authMode();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (m: string) => loadPortfolio(false).then((s) => ({ ...s, mode: m })),
    [mode],
    {
      keepPreviousData: true,
    },
  );
  const refresh = useCallback(async () => {
    cacheClear();
    await revalidate();
  }, [revalidate]);
  return { snapshot: data, isLoading, error, refresh };
}

export function useActivities(days = ACTIVITY_WINDOW_DAYS) {
  const mode = authMode();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (d: number, m: string) => loadActivities(d).then((a) => ({ activities: a, mode: m })),
    [days, mode],
    {
      keepPreviousData: true,
    },
  );
  const refresh = useCallback(async () => {
    cacheClear();
    await revalidate();
  }, [revalidate]);
  return { activities: data?.activities, isLoading, error, refresh };
}

export function useConnections() {
  const mode = authMode();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (m: string) => loadConnections(false).then((c) => ({ connections: c, mode: m })),
    [mode],
    {
      keepPreviousData: true,
    },
  );
  const refresh = useCallback(async () => {
    cacheClear();
    await revalidate();
  }, [revalidate]);
  return { connections: data?.connections, isLoading, error, refresh };
}
