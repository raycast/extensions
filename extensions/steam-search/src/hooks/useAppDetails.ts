import { CURRENCY_SYMBOLS } from "../constants";
import { getPreferenceValues, Color } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { AppDetails } from "../types";
import { memoryCache, loadPersistedDetails, persistDetails } from "../cache";
import { ggDealsCache } from "../api/ggdeals";
import { fetchSteamChartsData, fetchAppIcon } from "../api/steam";
import { getRatingColor, formatNum } from "../utils";

export function useAppDetails(
  appId: number,
  enabled: boolean,
): AppDetails | null {
  const { ggDealsApiKey, region } = getPreferenceValues();
  const cacheKey = `${appId}-${region}`;
  const [details, setDetails] = useState<AppDetails | null>(
    () => memoryCache.get(cacheKey) ?? null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      setDetails(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    (async () => {
      // Try persistent cache first
      const persisted = await loadPersistedDetails(appId, region);
      if (signal.aborted) return;
      if (persisted) {
        memoryCache.set(cacheKey, persisted);
        setDetails(persisted);
        return;
      }

      // Use batched GG.deals result if available, otherwise fetch individually
      const ggPrice = !ggDealsApiKey
        ? null
        : ggDealsCache.has(`${appId}-${region}`)
          ? (ggDealsCache.get(`${appId}-${region}`) ?? null)
          : await fetch(
              `https://api.gg.deals/v1/prices/by-steam-app-id/?key=${ggDealsApiKey}&ids=${appId}&region=${region}`,
              { signal },
            )
              .then((r) => r.json())
              .then((d: unknown) => {
                const parsed = d as {
                  data?: Record<
                    string,
                    { prices?: { currentKeyshops?: string } }
                  >;
                };
                const game = parsed?.data?.[String(appId)];
                if (game?.prices) {
                  const keyshop = parseFloat(game.prices.currentKeyshops ?? "");
                  return !isNaN(keyshop)
                    ? `🔑 ${keyshop.toFixed(2)}${CURRENCY_SYMBOLS[region] ?? "€"}`
                    : null;
                }
                return null;
              });

      if (signal.aborted) return;

      // Fetch Steam data in parallel
      const [detailsData, playersData, reviewsData] = await Promise.all([
        fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${region}`,
          { signal },
        )
          .then(
            (r) =>
              r.json() as Promise<
                Record<
                  number,
                  {
                    data?: {
                      is_free?: boolean;
                      price_overview?: {
                        final_formatted: string;
                        discount_percent: number;
                      };
                    };
                  }
                >
              >,
          )
          .catch(() => null),
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
      ]);

      if (signal.aborted) return;

      // Price
      const appData = detailsData?.[appId]?.data;
      let price = "—";
      if (appData?.is_free) {
        price = "Free";
      } else if (appData?.price_overview) {
        const p = appData.price_overview;
        price =
          p.discount_percent > 0
            ? `${p.final_formatted} (−${p.discount_percent}%)`
            : p.final_formatted;
      }

      // Players
      const current = playersData?.response?.player_count ?? 0;
      const currentPlayers = current > 0 ? `▶ ${formatNum(current)}` : "—";

      // Reviews
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

      const initial: AppDetails = {
        price,
        ggPrice,
        rating,
        ratingColor,
        currentPlayers,
        peakToday: null,
        peakAllTime: null,
        iconUrl: null,
      };
      memoryCache.set(cacheKey, initial);
      setDetails(initial);
      persistDetails(appId, region, initial);

      // Fetch slower secondary data (charts + icon)
      const [charts, iconUrl] = await Promise.all([
        fetchSteamChartsData(appId, signal),
        fetchAppIcon(appId, signal),
      ]);

      if (signal.aborted) return;

      const updated: AppDetails = {
        ...initial,
        peakToday: charts?.peak24h ?? null,
        peakAllTime: charts?.peakAllTime ?? null,
        iconUrl: iconUrl ?? null,
      };
      memoryCache.set(cacheKey, updated);
      setDetails(updated);
      persistDetails(appId, region, updated);
    })();

    return () => controller.abort();
  }, [appId, enabled]);

  return details;
}
