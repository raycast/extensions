import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (!enabled) return;
    if (!steamApiKey || !steamId) return;
    if (achievementsCache.has(appId)) {
      setStats(achievementsCache.get(appId) ?? null);
      return;
    }

    fetch(
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`,
    )
      .then(
        (r) =>
          r.json() as Promise<{
            playerstats?: { achievements?: { achieved: number }[] };
          }>,
      )
      .then((data) => {
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
        achievementsCache.set(appId, null);
        setStats(null);
      });
  }, [appId, enabled, steamApiKey, steamId]);

  return stats;
}
