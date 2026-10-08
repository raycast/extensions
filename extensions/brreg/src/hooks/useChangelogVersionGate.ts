import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@raycast/utils";
import { APP_VERSION, STORAGE_KEYS } from "../constants";

export function shouldDisplayChangelog(lastSeenVersion: string | undefined, currentVersion: string): boolean {
  const normalizedLastSeen = lastSeenVersion?.trim();
  const normalizedCurrent = currentVersion.trim();

  if (!normalizedCurrent || !normalizedLastSeen) {
    return false;
  }

  return normalizedLastSeen !== normalizedCurrent;
}

export function shouldMarkVersionAsSeen(
  isLoading: boolean,
  lastSeenVersion: string | undefined,
  currentVersion: string,
): boolean {
  const normalizedCurrent = currentVersion.trim();
  if (isLoading || !normalizedCurrent) {
    return false;
  }

  return lastSeenVersion?.trim() !== normalizedCurrent;
}

export function useChangelogVersionGate(currentVersion = APP_VERSION) {
  const {
    value: lastSeenVersion,
    setValue: setLastSeenVersion,
    isLoading,
  } = useLocalStorage<string>(STORAGE_KEYS.LAST_SEEN_CHANGELOG_VERSION);
  const hasInitializedRef = useRef(false);
  const lastSeenVersionRef = useRef<string | undefined>(lastSeenVersion);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    lastSeenVersionRef.current = lastSeenVersion;
  }, [lastSeenVersion]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const normalizedCurrent = currentVersion.trim();
    if (!normalizedCurrent) return;

    if (hasInitializedRef.current) return;

    if (lastSeenVersionRef.current === undefined) {
      hasInitializedRef.current = true;
      setLastSeenVersion(normalizedCurrent);
      return;
    }

    hasInitializedRef.current = true;
  }, [currentVersion, isLoading, setLastSeenVersion]);

  const shouldShowChangelog = useMemo(
    () => !isLoading && shouldDisplayChangelog(lastSeenVersion, currentVersion),
    [currentVersion, isLoading, lastSeenVersion],
  );

  const markCurrentVersionAsSeen = useCallback(async () => {
    const normalizedCurrent = currentVersion.trim();
    if (!shouldMarkVersionAsSeen(isLoadingRef.current, lastSeenVersionRef.current, normalizedCurrent)) return;

    await setLastSeenVersion(normalizedCurrent);
    // Keep ref in sync immediately to avoid duplicate writes before storage rehydrates.
    lastSeenVersionRef.current = normalizedCurrent;
  }, [currentVersion, setLastSeenVersion]);

  return {
    lastSeenVersion,
    shouldShowChangelog,
    markCurrentVersionAsSeen,
    isLoading,
  };
}
