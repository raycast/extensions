import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface AchievementStats {
  unlocked: number;
  total: number;
}

const achievementsCache = new Map<number, AchievementStats | null>();

// Set to true alongside MOCK in RecentlyPlayed.tsx — revert before pushing
export const MOCK_ACHIEVEMENTS_ENABLED = false;

const MOCK_ACHIEVEMENTS: Record<number, AchievementStats> = {
  1245620: { unlocked: 34, total: 42 },  // Elden Ring
  1086940: { unlocked: 38, total: 54 },  // Baldur's Gate 3
  730:     { unlocked: 12, total: 89 },  // Counter-Strike 2
  1091500: { unlocked: 22, total: 55 },  // Cyberpunk 2077
  292030:  { unlocked: 52, total: 52 },  // The Witcher 3 (complete)
  1145360: { unlocked: 49, total: 49 },  // Hades (complete)
  548430:  { unlocked: 87, total: 128 }, // Deep Rock Galactic
  367520:  { unlocked: 45, total: 63 },  // Hollow Knight
  413150:  { unlocked: 33, total: 40 },  // Stardew Valley
};

export function useAchievements(appId: number, enabled: boolean): AchievementStats | null {
  const { steamApiKey, steamId } = getPreferenceValues<{
    steamApiKey: string;
    steamId: string;
  }>();

  const [stats, setStats] = useState<AchievementStats | null>(
    () => achievementsCache.get(appId) ?? null,
  );

  useEffect(() => {
    if (!enabled) return;
    if (MOCK_ACHIEVEMENTS_ENABLED) {
      setStats(MOCK_ACHIEVEMENTS[appId] ?? null);
      return;
    }
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
