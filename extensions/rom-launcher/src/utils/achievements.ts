import { Cache } from "@raycast/api";
import { Achievement } from "../types";

const BASE_URL = "https://retroachievements.org/API/";
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

const cache = new Cache();

async function fetchRA(
  endpoint: string,
  params: Record<string, string>,
  signal?: AbortSignal,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const url = new URL(endpoint, BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), { signal });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function getAchievements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prefs: any,
  gameId: number,
  signal?: AbortSignal,
): Promise<{
  total: number;
  earned: number;
  totalPoints: number;
  earnedPoints: number;
  developer?: string;
  publisher?: string;
  genre?: string;
  achievements: Achievement[];
} | null> {
  if (!prefs.retroAchievementsUsername || !prefs.retroAchievementsApiKey)
    return null;

  const cacheKey = `ra_v2_${gameId}`;

  const cached = cache.get(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (
        parsed.timestamp &&
        Date.now() - parsed.timestamp < CACHE_EXPIRATION_MS
      ) {
        return parsed.data;
      }
    } catch (e) {
      cache.remove(cacheKey);
    }
  }

  try {
    const info = await fetchRA(
      "API_GetGameInfoAndUserProgress.php",
      {
        z: prefs.retroAchievementsUsername,
        y: prefs.retroAchievementsApiKey,
        u: prefs.retroAchievementsUsername,
        g: String(gameId),
      },
      signal,
    );

    const rawAchievements = info.Achievements || info.achievements || {};
    const achievementList = Object.values(rawAchievements);

    const total = info.NumAchievements || 0;
    const earned = info.NumAwardedToUser || 0;

    let totalPoints = 0;
    let earnedPoints = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const achievements: Achievement[] = achievementList.map((a: any) => {
      const pts = a.Points || 0;
      totalPoints += pts;
      if (a.DateEarned) earnedPoints += pts;

      return {
        id: String(a.ID || a.id),
        name: a.Title || a.title || "",
        description: a.Description || a.description || "",
        badgeUrl: a.BadgeName
          ? `https://media.retroachievements.org/Badge/${a.BadgeName}.png`
          : "",
        earned: !!a.DateEarned,
        dateEarned: a.DateEarned,
        earnedHardcore: !!a.DateEarnedHardcore,
        points: pts,
        numAwarded: a.NumAwarded || 0,
        numAwardedHardcore: a.NumAwardedHardcore || 0,
      };
    });

    achievements.sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0));

    const result = {
      total,
      earned,
      totalPoints,
      earnedPoints,
      developer: info.Developer,
      publisher: info.Publisher,
      genre: info.Genre,
      achievements,
    };

    try {
      cache.set(
        cacheKey,
        JSON.stringify({ timestamp: Date.now(), data: result }),
      );
    } catch (e) {
      cache.clear();
      cache.set(
        cacheKey,
        JSON.stringify({ timestamp: Date.now(), data: result }),
      );
    }

    return result;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if (e.name !== "AbortError") {
      console.error(`RA Fetch error for gameId ${gameId}:`, e.message);
    }
    return null;
  }
}
