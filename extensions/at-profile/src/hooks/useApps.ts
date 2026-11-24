import { useEffect, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getAppEntries } from "../helpers/apps";
import { STORAGE_KEYS, subscribeToStorage } from "../helpers/storage";
import { AppEntry } from "../types";

const EMPTY: AppEntry[] = [];

/**
 * Every app with its visibility, reloaded after any write to the app list. Manage Apps and Open Profile both use
 * this, so a change in one shows up in the other without a relaunch.
 */
export function useApps() {
  const { data, isLoading, revalidate } = useCachedPromise(getAppEntries, [], { keepPreviousData: true });

  useEffect(() => subscribeToStorage([STORAGE_KEYS.CUSTOM_APPS, STORAGE_KEYS.APP_SETTINGS], revalidate), [revalidate]);

  const entries = data ?? EMPTY;
  const visibleApps = useMemo(() => entries.filter((entry) => entry.visible), [entries]);
  return { entries, visibleApps, isLoading };
}
