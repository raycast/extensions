import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef } from "react";

interface AchievementStats {
  unlocked: number;
  total: number;
}

const achievementsCache = new Map<number, AchievementStats | null>();

export function useAchievements(
  appId: number,
  enabled: boolean,
): AchievementStats | null {
  const { steamApiKey, steamId } = getPreferenceValues<Preferences>();

  const [stats, setStats] = useState<AchievementStats | null>(
    () => achievementsCache.get(appId) ?? null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!steamApiKey || !steamId) return;
    if (achievementsCache.has(appId)) {
      setStats(achievementsCache.get(appId) ?? null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`,
      { signal: controller.signal },
    )
      .then(
        (r) =>
          r.json() as Promise<{
            playerstats?: { achievements?: { achieved: number }[] };
          }>,
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        const achievements = data?.playerstats?.achievements;
        if (!achievements?.length) {
          achievementsCache.set(appId, null);
          setStats(null);
          return;
        }
        const unlocked = achievements.filter((a) => a.achieved === 1).length;
        const result = { unlocked, total: achievements.length };
        achievementsCache.set(appId, result);
        setStats(result);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        achievementsCache.set(appId, null);
        setStats(null);
      });

    return () => controller.abort();
  }, [appId, enabled, steamApiKey, steamId]);

  return stats;
}
