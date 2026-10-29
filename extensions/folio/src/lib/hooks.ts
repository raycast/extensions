import { useCachedState, usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { AuthError, isSignedIn } from "./auth";
import { cacheClear, VIEW_CACHE_NAMESPACE } from "./cache";
import { ACTIVITY_WINDOW_DAYS, loadActivities, loadConnections, loadPortfolio } from "./data";
import { authMode } from "./preferences";

let refreshing: Promise<void> | null = null;

/**
 * ⌘R: clears the HTTP cache once, then reloads every view passed in. A second ⌘R while one is still
 * running joins it instead of clearing again and starting a second full load, which would double the
 * requests against SnapTrade's per-account rate limit.
 */
export function refreshTogether(...reloads: (() => unknown)[]): Promise<void> {
  if (!refreshing) {
    cacheClear();
    // usePromise types revalidate as void, but it returns the reload's promise.
    refreshing = Promise.all(reloads.map((reload) => Promise.resolve(reload())))
      .then(() => undefined)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/**
 * A loader's latest result, kept for instant paint the next time a view opens. It lives in Folio's
 * own cache namespace (not useCachedPromise's hidden one) so sign-out can clear it, and every view in
 * the command reading the same key sees each new result. After a failed reload the last good result
 * stays up while `error` says the refresh failed.
 */
function useLoaded<T>(key: string, load: () => Promise<T>, execute = true) {
  const [cached, setCached] = useCachedState<T | undefined>(key, undefined, { cacheNamespace: VIEW_CACHE_NAMESPACE });
  // The key carries everything the load depends on (mode, window), so passing it as the argument
  // re-runs the load when it changes. The load itself doesn't need it.
  const run: (key: string) => Promise<T> = async () => {
    const value = await load();
    // If the user signed out (in another command) while this load was running, don't write the
    // result back into the view cache sign-out just cleared.
    if (authMode() !== "fixtures" && !(await isSignedIn())) {
      throw new AuthError("Session expired. Sign in again.", "signed-out");
    }
    return value;
  };
  const { data, isLoading, error, revalidate } = usePromise(run, [key], {
    execute,
    onData: (value: T) => setCached(value),
  });
  return { data: data ?? cached, isLoading, error, revalidate };
}

/**
 * Portfolio snapshot (instant paint from the last result, plus the HTTP TTL cache).
 * `load: false` reads the snapshot another view already loaded and follows its updates, without
 * starting a load of its own (a pushed view in the same command).
 */
export function usePortfolio(opts?: { load?: boolean }) {
  const mode = authMode();
  const { data, isLoading, error, revalidate } = useLoaded(
    `portfolio:${mode}`,
    () => loadPortfolio(false),
    opts?.load ?? true,
  );
  const refresh = useCallback(() => refreshTogether(revalidate), [revalidate]);
  return { snapshot: data, isLoading, error, refresh, revalidate };
}

export function useActivities(days = ACTIVITY_WINDOW_DAYS) {
  const mode = authMode();
  const { data, isLoading, error, revalidate } = useLoaded(`activities:${mode}:${days}`, () => loadActivities(days));
  const refresh = useCallback(() => refreshTogether(revalidate), [revalidate]);
  return { activities: data?.activities, failures: data?.failures ?? [], isLoading, error, refresh, revalidate };
}

export function useConnections() {
  const mode = authMode();
  const { data, isLoading, error, revalidate } = useLoaded(`connections:${mode}`, () => loadConnections(false));
  const refresh = useCallback(() => refreshTogether(revalidate), [revalidate]);
  return { connections: data, isLoading, error, refresh };
}
