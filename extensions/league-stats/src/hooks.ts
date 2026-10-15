import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { Assets } from "./assets";
import { loadStatics } from "./ddragon";
import { readFavorites } from "./favoriteStore";
import type { Favorite } from "./favorites";
import { GameType, isGameType } from "./gametypes";
import { MATCH_COUNT, MAX_MATCHES } from "./match";
import { loadRecentMatches } from "./matches";
import { PlayerTarget, Profile, loadProfile } from "./profile";
import { Platform, isPlatform } from "./regions";
import { RiotApi } from "./riot";
import { matchKV, staticsKV } from "./storage";

export function useApi(): RiotApi {
  const { apiKey } = getPreferenceValues<Preferences>();
  return useMemo(() => new RiotApi(apiKey), [apiKey]);
}

/** The saved favorites, or undefined until they have been read. */
export function useFavorites(): Favorite[] | undefined {
  const [favorites, setFavorites] = useState<Favorite[]>();
  useEffect(() => {
    void readFavorites().then(setFavorites);
  }, []);
  return favorites;
}

export function defaultPlatform(): Platform {
  const { region } = getPreferenceValues<Preferences>();
  return isPlatform(region) ? region : "tr1";
}

/** Static tables load in the background; until then images fall back to placeholders. */
export function useAssets(): Assets {
  const { data } = useCachedPromise(() => loadStatics(staticsKV), [], { onError: () => undefined });
  return useMemo(() => new Assets(data), [data]);
}

// Errors are handled by the views themselves (they render a proper empty state), so the default toast is off.
export function useProfile(api: RiotApi, target: PlayerTarget) {
  const fallback = defaultPlatform();
  return useCachedPromise(
    (puuid: string, gameName: string, tagLine: string, platform: string) =>
      loadProfile(
        api,
        {
          puuid: puuid || undefined,
          gameName: gameName || undefined,
          tagLine: tagLine || undefined,
          platform: isPlatform(platform) ? platform : undefined,
        },
        fallback,
      ),
    [target.puuid ?? "", target.gameName ?? "", target.tagLine ?? "", target.platform ?? ""],
    { onError: () => undefined },
  );
}

export function defaultGameType(): GameType {
  const { gameType } = getPreferenceValues<Preferences>();
  return isGameType(gameType) ? gameType : "all";
}

/** The "Games to Load" preference: how many games to load at first, and per "Show More". */
export function defaultPageSize(): number {
  const { matchCount } = getPreferenceValues<Preferences>();
  const size = Number(matchCount);
  return Number.isInteger(size) && size >= 1 && size <= MAX_MATCHES ? size : MATCH_COUNT;
}

/**
 * The game type and the limit are part of the cache key, so neither the preference nor "Show More" can show another
 * list's data. Loading a bigger limit reuses every match already saved, so it only costs the new games.
 * `keepPreviousData` keeps the current rows on screen while the bigger list loads.
 */
export function useMatches(api: RiotApi, profile: Profile | undefined, gameType: GameType, limit: number) {
  return useCachedPromise(
    (puuid: string, platform: string, type: string, count: number) =>
      loadRecentMatches(api, matchKV, puuid, platform as Platform, count, type as GameType),
    [profile?.puuid ?? "", profile?.platform ?? "", gameType, limit],
    { execute: profile !== undefined, keepPreviousData: true, onError: () => undefined },
  );
}
