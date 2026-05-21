import { useState, useEffect, useRef } from "react";
import { Color } from "@raycast/api";
import { memoryCache } from "../cache";
import { fetchSteamChartsData } from "../api/steam";
import { getRatingColor, formatNum } from "../utils";
import { AppDetails } from "../types";

export function useGameStats(
  appId: number,
  enabled: boolean,
): Partial<AppDetails> | null {
  const cacheKey = `${appId}-stats`;
  const [stats, setStats] = useState<Partial<AppDetails> | null>(() => {
    const cached = memoryCache.get(cacheKey);
    return cached ?? null;
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      setStats(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    (async () => {
      const [playersData, reviewsData, charts] = await Promise.all([
        fetch(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
          { signal },
        )
          .then(
            (r) =>
              r.json() as Promise<{ response?: { player_count?: number } }>,
          )
          .catch(() => null),
        fetch(
          `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all`,
          { signal },
        )
          .then(
            (r) =>
              r.json() as Promise<{
                query_summary?: {
                  total_reviews?: number;
                  total_positive?: number;
                };
              }>,
          )
          .catch(() => null),
        fetchSteamChartsData(appId, signal),
      ]);

      if (signal.aborted) return;

      const current = playersData?.response?.player_count ?? 0;
      const currentPlayers = current > 0 ? `▶ ${formatNum(current)}` : "—";

      const summary = reviewsData?.query_summary;
      const totalReviews: number = summary?.total_reviews ?? 0;
      const totalPositive: number = summary?.total_positive ?? 0;
      let rating = "No reviews";
      let ratingColor = Color.SecondaryText;
      if (totalReviews > 0) {
        const pct = Math.round((totalPositive / totalReviews) * 100);
        rating = `${pct}% (${formatNum(totalReviews)})`;
        ratingColor = getRatingColor(pct);
      }

      const result: Partial<AppDetails> = {
        currentPlayers,
        rating,
        ratingColor,
        peakToday: charts?.peak24h ?? null,
        peakAllTime: charts?.peakAllTime ?? null,
        price: "—",
        ggPrice: null,
        iconUrl: null,
      };

      memoryCache.set(cacheKey, result as AppDetails);
      setStats(result);
    })();

    return () => controller.abort();
  }, [appId, enabled]);

  return stats;
}
