import * as raycastApi from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import { SetStateAction, useCallback, useEffect, useState } from "react";
import { emptyWindowData, loadWindowData, WindowSearchData } from "./window-data";
import { Window } from "./windows";
import { getErrorMessage } from "./helpers/applescript";

const CACHE_KEY = "window-search-snapshot-v3";
const cache = typeof raycastApi.Cache === "function" ? new raycastApi.Cache() : null;

function readCachedWindowData(): WindowSearchData | null {
  if (!cache) return null;
  try {
    const raw = cache.get(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WindowSearchData;
    if (!parsed || !Array.isArray(parsed.windows)) return null;
    return { ...emptyWindowData(), ...parsed };
  } catch {
    return null;
  }
}

function writeCachedWindowData(data: WindowSearchData): void {
  if (!cache) return;
  try {
    cache.set(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache write errors.
  }
}

export function useWindowSearch(enabled = true) {
  const [data, setData] = useState<WindowSearchData>(() => readCachedWindowData() ?? emptyWindowData());
  const [isLoading, setIsLoading] = useState<boolean>(() => data.windows.length === 0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let completeSnapshot: WindowSearchData | undefined;
    setIsLoading(true);
    void loadWindowData(
      (snapshot) => {
        if (cancelled) return;
        completeSnapshot = snapshot;
        setData(snapshot);
      },
      undefined,
      data,
    )
      .then(() => {
        if (cancelled || !completeSnapshot) return;
        // Persist once, while the visible list receives fresh core data and each enrichment as it arrives.
        writeCachedWindowData(completeSnapshot);
      })
      .catch(async (error) => {
        if (cancelled) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch windows",
          message: getErrorMessage(error),
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  const refreshWindows = useCallback(() => setRefreshKey((current) => current + 1), []);
  const setWindows = useCallback((update: SetStateAction<Window[]>) => {
    setData((current) => {
      const next = { ...current, windows: typeof update === "function" ? update(current.windows) : update };
      writeCachedWindowData(next);
      return next;
    });
  }, []);

  return { ...data, isLoading, refreshWindows, setWindows };
}
