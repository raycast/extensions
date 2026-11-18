import { getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ALL_PROVIDERS, providers } from "../lib/filters";
import { formatAge } from "../lib/format";
import type { LeaderboardSnapshot } from "../lib/models";
import { useComparison } from "./use-comparison";
import { useFavorites } from "./use-favorites";
import { describeLoadError, useLeaderboard } from "./use-leaderboard";

export function useRankingsData() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    ...useLeaderboard(preferences.apiKey),
    preferences,
    favorites: useFavorites(),
    comparison: useComparison(),
  };
}

export type RankingsData = ReturnType<typeof useRankingsData>;

export function useBrowseControls(
  snapshot: LeaderboardSnapshot | undefined,
  initial: { providerId?: string; favoritesOnly?: boolean } = {},
) {
  const [providerId, setProviderId] = useState(initial.providerId ?? ALL_PROVIDERS);
  const [favoritesOnly, setFavoritesOnly] = useState(initial.favoritesOnly ?? false);
  const creators = useMemo(() => providers(snapshot?.models ?? []), [snapshot]);
  return { providerId, setProviderId, favoritesOnly, setFavoritesOnly, creators };
}

export type BrowseControls = ReturnType<typeof useBrowseControls>;

export function hasActiveFilters(controls: BrowseControls): boolean {
  return controls.providerId !== ALL_PROVIDERS || controls.favoritesOnly;
}

export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Data freshness for section subtitles, e.g. "Updated 5m ago" or "Updated 2h ago · Refresh failed". */
export function updatedText(data: RankingsData, now: number): string {
  if (!data.snapshot) return "";
  return `Updated ${formatAge(data.snapshot.fetchedAt, now)}${data.error ? " · Refresh failed" : ""}`;
}

export function failureMessage(data: RankingsData): string | undefined {
  return data.error ? describeLoadError(data.error) : undefined;
}
