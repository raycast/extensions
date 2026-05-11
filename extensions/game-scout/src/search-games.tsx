import { useEffect, useState, useMemo } from "react";
import { useFetch } from "@raycast/utils";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Detail,
  LocalStorage,
  Cache,
  getPreferenceValues,
  openExtensionPreferences,
  Image,
} from "@raycast/api";

const preferences = getPreferenceValues<{
  itadApiKey: string;
  country: string;
  maxResults: string;
  showMature: boolean;
  showDLCGameSearch: boolean;
  showPriceHistoryChart: boolean;
}>();

const API_KEY = (preferences.itadApiKey || "").trim();
const COUNTRY = preferences.country;
const MAX_RESULTS = parseInt(preferences.maxResults) || 25;

const detailCache = new Cache({ namespace: "search_detail" });
const DETAIL_CACHE_TTL = 6 * 60 * 60 * 1000;
const RECENT_BUNDLE_WINDOW = 2 * 365 * 24 * 60 * 60 * 1000;

import { formatPrice, isStoreAllowed, buildBundleMap } from "./utils";

export default function Command() {
  const [apiError, setApiError] = useState(false);
  const isApiKeyValid = API_KEY.length > 0;
  const isCountryValid = COUNTRY.length === 2;

  if (!isApiKeyValid || !isCountryValid) {
    return (
      <List>
        <List.EmptyView
          icon={!isApiKeyValid ? Icon.Key : Icon.Globe}
          title={!isApiKeyValid ? "API Key Required" : "Region Setup Required"}
          description="Please enter your API Key and select a Region in preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savedGames, setSavedGames] = useState<
    { id: string; title: string; slug: string; type?: string }[]
  >([]);

  useEffect(() => {
    LocalStorage.getItem<string>("saved_itad_games").then(
      (stored) => stored && setSavedGames(JSON.parse(stored)),
    );
  }, []);

  const toggleSave = async (game: any) => {
    let newList;
    if (savedGames.some((g) => g.id === game.id)) {
      newList = savedGames.filter((g) => g.id !== game.id);
    } else {
      newList = [
        ...savedGames,
        {
          id: game.id,
          title: game.title,
          slug: game.slug,
          type: game.type || "OTHER",
        },
      ];

      const savedCache = new Cache();
      savedCache.remove(`itad_saved_prices_v1_${COUNTRY}`);
    }
    setSavedGames(newList);
    await LocalStorage.setItem("saved_itad_games", JSON.stringify(newList));
  };

  useEffect(() => {
    if (!searchQuery) {
      setSearchData([]);
      return;
    }
    const fetchData = async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch(
          `https://api.isthereanydeal.com/games/search/v1?key=${API_KEY}&title=${encodeURIComponent(searchQuery)}`,
        );
        if (res.status === 401 || res.status === 403) {
          setApiError(true);
          setLoadingSearch(false);
          return;
        }
        const json = await res.json();
        const results = Array.isArray(json)
          ? json
          : json.data || json.results || [];
        const query = searchQuery.toLowerCase();

        const score = (t: string) => {
          const lower = t.toLowerCase();
          if (lower === query) return 0;
          if (lower.startsWith(query)) return 1;
          if (lower.includes(query)) return 2;
          return 3;
        };
        results.sort((a: any, b: any) => score(a.title) - score(b.title));

        setSearchData(results);
      } catch {
        setSearchData([]);
      }
      setLoadingSearch(false);
    };
    fetchData();
  }, [searchQuery]);

  const gameIds = searchData?.slice(0, MAX_RESULTS).map((g: any) => g.id) || [];

  const { data: priceData, isLoading: priceLoading } = useFetch<any>(
    `https://api.isthereanydeal.com/games/overview/v2?key=${API_KEY}&country=${COUNTRY}&nondeals=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gameIds),
      execute: gameIds.length > 0 && searchQuery.length > 0,
      mapResult: (res: any) => ({
        data: Array.isArray(res) ? res : Object.values(res).flat(),
      }),
    },
  );

  const bundleCounts = useMemo(() => {
    if (!priceData) return {};
    return buildBundleMap(priceData);
  }, [priceData]);

  const filteredData = searchData.filter((game: any) => {
    if (!preferences.showMature && game.mature) return false;
    if (!preferences.showDLCGameSearch && game.type === "dlc") return false;
    return true;
  });

  const isTyping =
    searchText.trim() !== searchQuery && searchText.trim().length > 0;

  return (
    <List
      isLoading={loadingSearch}
      onSearchTextChange={(t) => {
        setSearchText(t);
        if (t.trim() === "") setSearchQuery("");
      }}
      searchBarPlaceholder="Search games (e.g. Elden Ring)..."
    >
      {apiError ? (
        <List.EmptyView
          title="Invalid API Key"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : searchQuery.length === 0 ? (
        <List.EmptyView
          title="Waiting for Input"
          description="Try a different game name (e.g. Elden Ring)"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                onAction={() => setSearchQuery(searchText.trim())}
                icon={Icon.MagnifyingGlass}
              />
            </ActionPanel>
          }
        />
      ) : filteredData.length === 0 && !loadingSearch ? (
        <List.EmptyView
          title="No Results Found"
          description="Try a different game name (e.g. Elden Ring)"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                onAction={() => setSearchQuery(searchText.trim())}
                icon={Icon.MagnifyingGlass}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredData.slice(0, MAX_RESULTS).map((game: any) => {
          const overview = Array.isArray(priceData)
            ? priceData.find((p: any) => p.id === game.id)
            : undefined;
          const deal = overview?.current || overview;
          const isSaved = savedGames.some((g) => g.id === game.id);

          const accessories = [];
          if (game.mature)
            accessories.push({
              tag: { value: "18+", color: Color.Red },
              tooltip: "Mature Content",
            });

          if (priceLoading && !deal) {
            accessories.push({
              icon: Icon.Clock,
              tooltip: "Loading price...",
              tintColor: Color.SecondaryText,
            });
          } else if (deal) {
            const currentAmount = deal.price?.amount;
            const regularAmount = deal.regular?.amount;
            const currency = deal.price?.currency;
            const cut = deal.cut || 0;

            if (
              cut > 0 &&
              regularAmount != null &&
              regularAmount > currentAmount
            ) {
              accessories.push({
                text: `${formatPrice(regularAmount, currency)} → ${formatPrice(currentAmount, currency)}`,
              });
              accessories.push({
                tag: { value: `-${cut}%`, color: Color.Green },
              });
            } else {
              accessories.push({ text: formatPrice(currentAmount, currency) });
            }

            if (
              typeof bundleCounts !== "undefined" &&
              bundleCounts[String(game.id)] > 0
            ) {
              accessories.push({
                icon: { source: Icon.Box, tintColor: Color.Purple },
                tooltip: "Available in a Bundle",
              });
            }
          }
          const isMusic =
            (game.type === null || game.type === "dlc") &&
            (game.title?.toLowerCase().endsWith(" ost") ||
              game.title?.toLowerCase().includes("soundtrack"));
          const cleanType = isMusic
            ? "SOUNDTRACK"
            : game.type === "game" || game.type === "base"
              ? undefined
              : game.type?.toUpperCase() || undefined;

          return (
            <List.Item
              key={game.id}
              title={game.title}
              icon={
                isSaved
                  ? Icon.Star
                  : game.type === "dlc" && !isMusic
                    ? Icon.Download
                    : isMusic
                      ? Icon.Music
                      : game.type === "package"
                        ? Icon.Box
                        : Icon.GameController
              }
              subtitle={cleanType}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {isTyping ? (
                      <Action
                        title="Search"
                        onAction={() => setSearchQuery(searchText.trim())}
                        icon={Icon.MagnifyingGlass}
                      />
                    ) : (
                      <Action.Push
                        title="View Game Details"
                        target={
                          <GameDetail
                            gameId={game.id}
                            gameTitle={game.title}
                            gameSlug={game.slug}
                            gameType={game.type || "OTHER"}
                            isSaved={isSaved}
                            toggleSave={() => toggleSave(game)}
                          />
                        }
                        icon={Icon.Sidebar}
                      />
                    )}
                    <Action
                      title={isSaved ? "Remove from Saved" : "Save Game"}
                      onAction={() => toggleSave(game)}
                      icon={isSaved ? Icon.Trash : Icon.Star}
                      shortcut={{
                        Windows: { modifiers: ["ctrl"], key: "s" },
                        macOS: { modifiers: ["cmd"], key: "s" },
                      }}
                      style={
                        isSaved
                          ? Action.Style.Destructive
                          : Action.Style.Regular
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function GameDetail({
  gameId,
  gameTitle,
  gameSlug,
  gameType,
  isSaved,
  toggleSave,
  removeGame,
}: any) {
  const [data, setData] = useState<any>({
    steamData: null,
    realBundles: [],
    deals: [],
    historyLow: null,
    overview: null,
    historyChart: [],
    lastChecked: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<"3m" | "6m" | "1y">("1y");
  const SHOW_CHART = preferences.showPriceHistoryChart ?? true;
  const [selectedStores, setSelectedStores] = useState<string[]>(["all"]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    LocalStorage.getItem<string>("selected_stores").then((s) =>
      setSelectedStores(s ? JSON.parse(s) : ["all"]),
    );
    LocalStorage.getItem<string>("preferred_chart_range").then(
      (s) => s && setRange(s as any),
    );
  }, [refreshKey]);

  const handleSetRange = (r: "3m" | "6m" | "1y") => {
    setRange(r);
    LocalStorage.setItem("preferred_chart_range", r);
  };

  useEffect(() => {
    let isMounted = true;
    const abort = new AbortController();
    const detailCacheKey = `search_detail_${gameId}_${COUNTRY}_v1`;

    const fetchDetailData = async () => {
      setIsLoading(true);
      const cached = detailCache.get(detailCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < DETAIL_CACHE_TTL) {
          if (isMounted) {
            setData({ ...parsed.data, lastChecked: parsed.timestamp });
            setIsLoading(false);
          }
          return;
        }
      }

      try {
        const searchRes = await fetch(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameTitle)}&l=english&cc=US`,
          { signal: abort.signal },
        );
        const searchJson = await searchRes.json();

        let targetItem = searchJson?.items?.find(
          (item: any) => item.name.toLowerCase() === gameTitle.toLowerCase(),
        );
        if (!targetItem) {
          targetItem = searchJson?.items?.find((item: any) => {
            const sName = item.name.toLowerCase();
            const iName = gameTitle.toLowerCase();
            if (sName.includes(iName) || iName.includes(sName)) {
              const sNums = sName.match(/\b\d+\b/g) || [];
              const iNums = iName.match(/\b\d+\b/g) || [];
              return sNums.every((n: string) => iNums.includes(n));
            }
            return false;
          });
        }
        if (!targetItem) targetItem = searchJson?.items?.[0];

        let steamData = null;
        if (targetItem?.id) {
          const detailRes = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${targetItem.id}&l=english`,
            { signal: abort.signal },
          );
          steamData = (await detailRes.json())?.[targetItem.id]?.data || null;
        }

        const fetchPromises = [
          fetch(
            `https://api.isthereanydeal.com/games/bundles/v2?key=${API_KEY}&id=${gameId}`,
            { signal: abort.signal },
          ),
          fetch(
            `https://api.isthereanydeal.com/games/prices/v2?key=${API_KEY}&country=${COUNTRY}&nondeals=true`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([gameId]),
              signal: abort.signal,
            },
          ),
          fetch(
            `https://api.isthereanydeal.com/games/historylow/v1?key=${API_KEY}&country=${COUNTRY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([gameId]),
              signal: abort.signal,
            },
          ),
          fetch(
            `https://api.isthereanydeal.com/games/overview/v2?key=${API_KEY}&country=${COUNTRY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([gameId]),
              signal: abort.signal,
            },
          ),
        ];
        if (SHOW_CHART)
          fetchPromises.push(
            fetch(
              `https://api.isthereanydeal.com/games/history/v2?key=${API_KEY}&id=${gameId}&country=${COUNTRY}`,
              { signal: abort.signal },
            ),
          );

        const jsons = await Promise.all(
          (await Promise.all(fetchPromises)).map((r) => r.json()),
        );
        const combined = {
          steamData,
          realBundles: Array.isArray(jsons[0])
            ? jsons[0]
            : jsons[0]?.[gameId]?.bundles || [],
          deals:
            (Array.isArray(jsons[1])
              ? jsons[1][0]?.deals
              : jsons[1]?.[gameId]?.deals) || [],
          historyLow:
            (Array.isArray(jsons[2])
              ? jsons[2][0]?.low
              : jsons[2]?.[gameId]?.low) || null,
          overview: Array.isArray(jsons[3]) ? jsons[3][0] : jsons[3],
          historyChart: Array.isArray(jsons[4]) ? jsons[4] : [],
        };

        if (isMounted) {
          detailCache.set(
            detailCacheKey,
            JSON.stringify({ timestamp: Date.now(), data: combined }),
          );
          setData({ ...combined, lastChecked: Date.now() });
        }
      } catch (e: any) {
        if (e.name !== "AbortError" && !e.message?.includes("aborted"))
          console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchDetailData();
    return () => {
      isMounted = false;
      abort.abort();
    };
  }, [gameId, gameTitle, SHOW_CHART, refreshKey]);

  const {
    steamData,
    realBundles,
    deals,
    historyLow,
    overview,
    historyChart,
    lastChecked,
  } = data;

  // ⏱️ TIME DOMAIN: Single deterministic snapshot
  const now = useMemo(() => Date.now(), [refreshKey]);

  // 📦 BUNDLE DOMAIN: Single source of truth
  const bundle = useMemo(() => {
    const isBundleActive = (b: any) => {
      if (!b?.expiry) return true;
      const t = new Date(b.expiry).getTime();
      return Number.isFinite(t) && t > now;
    };

    const activeBundles = realBundles.filter(isBundleActive);
    const activeCount = activeBundles.length;

    const recentBundles = realBundles.filter((b: any) => {
      const tsRaw = b.created ?? b.timestamp;
      const ts = tsRaw ? new Date(tsRaw).getTime() : null;
      return ts && ts < now && now - ts < RECENT_BUNDLE_WINDOW;
    });

    const totalBundles =
      realBundles?.length > 0
        ? realBundles.length
        : typeof overview?.bundles === "number"
          ? overview.bundles
          : overview?.bundles?.count || overview?.bundles?.length || 0;

    const allBundlesForTs = Array.isArray(overview?.bundles)
      ? overview.bundles
      : realBundles;

    const timestamps = allBundlesForTs
      .map((b: any) => {
        const ts = b.created ?? b.timestamp ?? b.publish ?? b.expiry;
        return ts ? new Date(ts).getTime() : null;
      })
      .filter((t: any) => t !== null && !isNaN(t));

    const lastBundleTs =
      timestamps.length > 0 ? Math.max(...timestamps) : undefined;
    const lastBundleDate = lastBundleTs ? new Date(lastBundleTs) : null;
    const lastBundleAgo = lastBundleTs ? now - lastBundleTs : Infinity;

    const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

    let state: string | null = null;
    let icon: Image.ImageLike | undefined = undefined;
    let color: Color | undefined = undefined;

    if (activeCount > 0) {
      state = "Active";
      icon = Icon.Box;
      color = Color.Purple;
    } else if (totalBundles === 0) {
      state = "Never Bundled";
      icon = Icon.XMarkCircle;
      color = Color.SecondaryText;
    } else if (recentBundles.length >= 4 && lastBundleAgo < ONE_YEAR) {
      state = "Frequent";
      icon = Icon.Repeat;
      color = Color.Orange;
    } else if (totalBundles >= 2 && lastBundleAgo < ONE_YEAR) {
      state = "Occasional";
      icon = Icon.Circle;
      color = Color.SecondaryText;
    } else if (totalBundles === 1 && lastBundleAgo < ONE_YEAR) {
      state = "Bundled recently";
      icon = Icon.Circle;
      color = Color.SecondaryText;
    } else if (lastBundleDate) {
      const month = lastBundleDate.toLocaleString("en-US", { month: "short" });
      const year = lastBundleDate.getFullYear();
      state = `Last bundled ${month} ${year}`;
      icon = Icon.Clock;
      color = Color.SecondaryText;
    }

    const getLowestPrice = (bundle: any) => {
      const prices = bundle.tiers
        ?.map((t: any) => t.price?.amount)
        .filter((p: number | undefined) => typeof p === "number");
      return prices?.length ? Math.min(...prices) : Infinity;
    };

    const featuredBundle =
      activeBundles.length > 0
        ? activeBundles.reduce(
            (best: any, current: any) =>
              getLowestPrice(current) < getLowestPrice(best) ? current : best,
            activeBundles[0],
          )
        : null;

    const featuredPrice = featuredBundle
      ? getLowestPrice(featuredBundle)
      : null;

    const getGameTierPrice = (b: any) => {
      const tiersWithGame = b.tiers?.filter((t: any) =>
        t.games?.some((gm: any) => gm.id === gameId),
      );
      if (tiersWithGame && tiersWithGame.length > 0) {
        const prices = tiersWithGame
          .map((t: any) => t.price?.amount)
          .filter((p: any) => typeof p === "number");
        return prices.length > 0 ? Math.min(...prices) : Infinity;
      }
      return Infinity;
    };

    const bestGameTierPrice =
      activeBundles.length > 0
        ? Math.min(...activeBundles.map(getGameTierPrice))
        : null;

    const actualBundlePrice =
      bestGameTierPrice !== Infinity && bestGameTierPrice !== null
        ? bestGameTierPrice
        : featuredPrice;

    return {
      activeBundles,
      activeCount,
      recentBundles,
      totalBundles,
      state,
      icon,
      color,
      featuredBundle,
      featuredPrice,
      actualBundlePrice,
      getLowestPrice,
    };
  }, [realBundles, overview, now, gameId]);

  const allowedHistory = useMemo(() => {
    return (historyChart || []).filter(
      (pt: any) =>
        pt.deal?.price?.amount != null &&
        isStoreAllowed(pt.shop?.name || "", selectedStores),
    );
  }, [historyChart, selectedStores]);

  const filteredDeals = deals.filter((d: any) =>
    isStoreAllowed(d.shop?.name || "", selectedStores),
  );
  const currentBest = filteredDeals?.[0];
  const currentPrice = currentBest?.price?.amount;

  const bundleValue = useMemo(() => {
    if (!bundle.activeBundles.length || currentPrice == null) return null;

    for (const b of bundle.activeBundles) {
      let gameTierIndex = -1;
      b.tiers?.forEach((t: any, i: number) => {
        if (
          t.games?.some((gm: any) => gm.id === gameId || gm.name === gameTitle)
        ) {
          gameTierIndex = i;
        }
      });

      if (gameTierIndex === -1) continue;

      const tierPrice = b.tiers[gameTierIndex]?.price?.amount;
      if (!tierPrice) continue;

      if (tierPrice < currentPrice) {
        return {
          type: "better",
          message: "Cheaper in active bundle",
          tier: b.tiers[gameTierIndex],
          bundle: b,
        };
      }

      let totalGames = 0;
      for (let i = 0; i <= gameTierIndex; i++) {
        totalGames += b.tiers[i]?.games?.length || 0;
      }

      const unitPrice = totalGames > 0 ? tierPrice / totalGames : tierPrice;
      if (unitPrice < currentPrice) {
        return {
          type: "value",
          message: "Better value in bundle",
          tier: b.tiers[gameTierIndex],
          bundle: b,
        };
      }
    }
    return null;
  }, [bundle.activeBundles, currentPrice, gameId, gameTitle]);

  const allTimeLow = historyLow?.price?.amount ?? historyLow?.amount;
  const hCurrency =
    historyLow?.price?.currency ?? historyLow?.currency ?? "USD";

  // 🧮 SCORE DOMAIN: Untouched heuristic engine
  const twelveMonthTime = now - 365 * 24 * 60 * 60 * 1000;
  const statsPrices = allowedHistory
    .filter((pt: any) => new Date(pt.timestamp).getTime() >= twelveMonthTime)
    .map((pt: any) => pt.deal.price.amount);

  let typicalMin: number | null = null;
  let typicalMax: number | null = null;
  let median: number | null = null;

  if (statsPrices.length > 0) {
    const sorted = [...statsPrices].sort((a, b) => a - b);
    const filtered = sorted.slice(
      Math.floor(sorted.length * 0.1),
      Math.floor(sorted.length * 0.9) + 1,
    );
    if (filtered.length > 0) {
      typicalMin = Math.min(...filtered);
      typicalMax = Math.max(...filtered);
      const mid = Math.floor(filtered.length / 2);
      median =
        filtered.length % 2 !== 0
          ? filtered[mid]
          : (filtered[mid - 1] + filtered[mid]) / 2;
    }
  }

  const cut = currentBest?.cut || 0;
  let verdict = "";
  let reason: string | undefined;
  let recommendation = "";

  const mapUI = (v: string) => {
    switch (v) {
      case "Free":
        return { badge: "free", color: Color.Blue, icon: Icon.Gift };
      case "Strong deal":
        return { badge: "best", color: Color.Green, icon: Icon.Star };
      case "Good deal":
        return { badge: "good", color: Color.Green, icon: Icon.ThumbsUp };
      case "Fair price":
        return {
          badge: "neutral",
          color: Color.SecondaryText,
          icon: Icon.Minus,
        };
      case "Not great":
      case "Not ideal":
        return { badge: "weak", color: Color.Orange, icon: Icon.Clock };
      case "Overpriced":
        return { badge: "bad", color: Color.Red, icon: Icon.XMarkCircle };
      default:
        return {
          badge: "neutral",
          color: Color.SecondaryText,
          icon: Icon.Minus,
        };
    }
  };

  if (currentPrice === 0 || cut === 100) {
    recommendation = "🆓 FREE";
    verdict = "Free";
    reason = "Free to claim";
  } else if (bundle.activeCount > 0 && bundleValue?.type === "better") {
    recommendation = "🔴 HIGH PRICE";
    verdict = "Overpriced";
    reason = bundleValue.message;
  } else if (bundle.activeCount > 0 && bundleValue?.type === "value") {
    recommendation = "🟡 FAIR PRICE";
    verdict = "Not ideal";
    reason = bundleValue.message;
  } else if (currentPrice != null) {
    let score = 0;
    const safeATL =
      allTimeLow && allTimeLow > 0 ? allTimeLow : currentPrice || 1;
    const ratioATL = currentPrice / safeATL;

    if (ratioATL <= 0.95) score += 0.35;
    else if (ratioATL <= 1.05) score += 0.25;
    else if (ratioATL <= 1.2) score += 0.1;
    else if (ratioATL >= 2) score -= 0.2;

    if (median != null && median > 0) {
      const ratioMedian = currentPrice / median;
      if (ratioMedian <= 0.75) score += 0.25;
      else if (ratioMedian <= 0.9) score += 0.15;
      else if (ratioMedian >= 1.25) score -= 0.2;
    }

    if (cut >= 75 && ratioATL <= 1.2) score += 0.4;
    else if (cut >= 75) score += 0.3;
    else if (cut >= 50) score += 0.2;
    else if (cut >= 25) score += 0.1;
    else if (cut > 0) score += 0.05;

    score = Math.max(0, Math.min(1, score));

    // Recommendation thresholds
    if (score >= 0.7) recommendation = "🔥 GREAT DEAL";
    else if (score >= 0.5) recommendation = "👍 GOOD DEAL";
    else if (score >= 0.35) recommendation = "🟡 FAIR PRICE";
    else recommendation = "🔴 HIGH PRICE";

    const isATL = currentPrice <= safeATL;
    const isNearATL = currentPrice <= safeATL * 1.05;
    const isBelowAvg = median && currentPrice < median * 0.85;
    const isAtTypical = median && currentPrice <= median * 1.05;

    if (score < 0.35) {
      if (cut === 0 && (!median || isAtTypical)) {
        verdict = "Fair price";
        reason = "Typical price for this game";
        recommendation = "🟡 FAIR PRICE";
      } else {
        verdict = cut > 0 ? "Not ideal" : "Overpriced";
        reason =
          cut > 0 ? "Discounted, but still high" : "Above usual price range";
      }
    } else if (score < 0.5) {
      verdict = "Not ideal";
      if (bundle.state === "Frequent") reason = "Frequently bundled, wait";
      else if (cut >= 70) reason = "Big discount, not lowest";
      else
        reason = cut > 0 ? "Small discount, better wait" : "No discount, wait";
    } else {
      if (isATL) {
        verdict = score >= 0.7 ? "Strong deal" : "Good deal";
        reason = cut > 0 ? "At all-time low price" : "Lowest recorded price";
      } else if (isNearATL) {
        verdict = "Good deal";
        reason = "Near all-time low price";
      } else if (cut >= 75) {
        verdict = "Good deal";
        reason = "Large discount applied";
      } else if (isBelowAvg) {
        verdict = "Good deal";
        reason = "Well below usual price";
      } else {
        verdict = "Fair price";
        reason = "Decent price, not the lowest";
      }
    }
  }

  if (!reason) {
    reason = "Typical pricing";
  }

  const plotData: any[] = [];
  const cutoffTime =
    now -
    (range === "3m" ? 90 : range === "6m" ? 180 : 365) * 24 * 60 * 60 * 1000;
  if (allowedHistory.length > 0) {
    allowedHistory
      .filter((pt: any) => new Date(pt.timestamp).getTime() >= cutoffTime)
      .reverse()
      .forEach((pt: any) => {
        plotData.push({
          x: new Date(pt.timestamp).toISOString().split("T")[0],
          y: pt.deal.price.amount,
        });
      });
  }

  let chartUrl = "";
  if (SHOW_CHART && plotData.length > 0) {
    const minY = Math.min(...plotData.map((p) => p.y));
    const datasets: any[] = [
      {
        data: plotData,
        borderColor: "#2ecc71",
        backgroundColor: "rgba(46, 204, 113, 0.05)",
        steppedLine: true,
        fill: true,
        pointRadius: plotData.map((p) => (Math.abs(p.y - minY) < 0.01 ? 4 : 0)),
        pointBackgroundColor: plotData.map((p) =>
          Math.abs(p.y - minY) < 0.01 ? "#e74c3c" : "transparent",
        ),
        pointBorderColor: plotData.map((p) =>
          Math.abs(p.y - minY) < 0.01 ? "#ffffff" : "transparent",
        ),
        pointBorderWidth: 2,
        borderWidth: 2,
      },
    ];

    if (median !== null) {
      datasets.push({
        data: plotData.map((p) => ({ x: p.x, y: median })),
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      });
    }

    const config: any = {
      type: "line",
      data: { datasets },
      options: {
        layout: { padding: { right: 30, left: 5, top: 10, bottom: 5 } },
        legend: { display: false },
        scales: {
          xAxes: [
            {
              type: "time",
              time: {
                parser: "YYYY-MM-DD",
                unit: "month",
                displayFormats: { month: "MMM YY" },
              },
              gridLines: { color: "rgba(255, 255, 255, 0.1)" },
              ticks: { maxRotation: 0, maxTicksLimit: 6, fontSize: 8 },
            },
          ],
          yAxes: [
            {
              gridLines: { color: "rgba(255, 255, 255, 0.1)" },
              ticks: { beginAtZero: true, fontSize: 8 },
            },
          ],
        },
        annotation: {
          annotations: [
            {
              type: "line",
              mode: "horizontal",
              scaleID: "y-axis-0",
              value: minY,
              borderColor: "rgba(231, 76, 60, 0.8)",
              borderWidth: 1,
              borderDash: [2, 2],
              label: {
                enabled: true,
                content: "ATL",
                position: "right",
                backgroundColor: "rgba(231, 76, 60, 0.8)",
                fontSize: 8,
                yAdjust: 6,
              },
            },
          ],
        },
      },
    };
    chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=250&h=110&devicePixelRatio=2&bkg=transparent`;
  }

  const isDiscounted = currentBest && currentBest.cut > 0;
  let saleTagText = "";
  if (isDiscounted) {
    if (currentBest.cut >= 70) saleTagText = "MEGA SALE";
    else if (currentBest.cut >= 40) saleTagText = "ON SALE";
    else saleTagText = "DISCOUNT";
  }

  const heroSection =
    currentBest && currentPrice != null
      ? `<h2 align="center">${recommendation || "Price Details"}</h2>\n<h3 align="center">${formatPrice(currentPrice, currentBest.price?.currency)} ${isDiscounted ? `<code>-${currentBest.cut}%</code>` : ""} · ${currentBest.shop?.name}</h3>\n\n---\n\n`
      : "";

  const markdown = `
${steamData?.header_image ? `<img src="${steamData.header_image}" width="280" />\n\n` : ""}
# ${gameTitle}
${
  steamData?.genres
    ? `*${steamData.genres
        .map((g: any) => g.description)
        .slice(0, 2)
        .join(
          ", ",
        )}*${steamData?.release_date?.date ? ` · ${new Date(steamData.release_date.date).getFullYear()}` : ""}`
    : ""
}

${steamData?.short_description ? `> ${steamData.short_description.replace(/<[^>]*>?/gm, "").split(". ")[0]}.` : ""}

${heroSection}
💰 **Prices in ${COUNTRY}**

| Store | Price | RRP | Discount |
| :--- | :--- | :--- | :--- |
${filteredDeals?.length ? filteredDeals.map((p: any) => `| ${p.url ? `[${p.shop?.name}](${p.url})` : p.shop?.name} | **${formatPrice(p.price?.amount, p.price?.currency)}** | ${formatPrice(p.regular?.amount, p.price?.currency)} | ${p.cut > 0 ? "-" + p.cut + "%" : "-"} |`).join("\n") : "| No data found | - | - | - |"}

${chartUrl ? `\n---\n\n📈 **Trend: ${range === "1y" ? "12 Months" : range === "6m" ? "6 Months" : "3 Months"}**\n\n![Price History](${chartUrl})\n` : ""}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={gameTitle}
      metadata={
        <Detail.Metadata>
          {recommendation && (
            <Detail.Metadata.Label
              title="Recommendation"
              text={recommendation}
            />
          )}
          {verdict &&
            ["🔥 GREAT DEAL", "👍 GOOD DEAL", "🆓 FREE"].includes(
              recommendation,
            ) && (
              <Detail.Metadata.Label
                title="Verdict"
                text={verdict}
                icon={{
                  source: mapUI(verdict).icon,
                  tintColor: mapUI(verdict).color,
                }}
              />
            )}
          {reason && (
            <Detail.Metadata.Label
              title="Why"
              text={reason.length > 28 ? reason.slice(0, 25) + "..." : reason}
            />
          )}
          {(isDiscounted || bundle.activeCount > 0) && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Tags">
                {isDiscounted && (
                  <Detail.Metadata.TagList.Item
                    text={saleTagText}
                    color={Color.Green}
                  />
                )}
                {bundle.activeCount > 0 && (
                  <Detail.Metadata.TagList.Item
                    text="IN BUNDLE"
                    color={Color.Purple}
                  />
                )}
              </Detail.Metadata.TagList>
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="All-Time Low"
            text={
              allTimeLow != null
                ? formatPrice(allTimeLow, hCurrency)
                : "No History"
            }
            icon={
              allTimeLow != null
                ? { source: Icon.Checkmark, tintColor: Color.Green }
                : Icon.XMarkCircle
            }
          />
          {typicalMin !== null &&
            typicalMax !== null &&
            typicalMin !== typicalMax && (
              <Detail.Metadata.Label
                title="Typical Price"
                text={`${formatPrice(typicalMin, hCurrency)} - ${formatPrice(typicalMax, hCurrency)}`}
              />
            )}
          {median !== null && (
            <Detail.Metadata.Label
              title="Median Price"
              text={formatPrice(median, hCurrency)}
            />
          )}

          {bundle.state && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Bundle Status"
                text={bundle.state}
                icon={{ source: bundle.icon!, tintColor: bundle.color! }}
              />
            </>
          )}
          {bundleValue?.tier && bundleValue?.bundle && (
            <Detail.Metadata.Link
              title="Bundle Tier"
              target={
                bundleValue.bundle.url || bundleValue.bundle.details || ""
              }
              text={
                bundleValue.tier.price
                  ? `${bundleValue.bundle.page?.name || "Bundle"} · ${formatPrice(bundleValue.tier.price.amount, bundleValue.tier.price.currency || hCurrency)}`
                  : bundleValue.bundle.page?.name || "View Bundle"
              }
            />
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Price Sources"
            text={
              selectedStores.includes("all") ||
              selectedStores.length === 0 ||
              selectedStores.length >= 23
                ? "All Stores"
                : `${selectedStores.length} Selected`
            }
          />
          <Detail.Metadata.Label
            title="Content Type"
            text={gameType.toUpperCase()}
          />
          <Detail.Metadata.Label
            title="Store Region"
            text={COUNTRY.toUpperCase()}
            icon={`https://flagcdn.com/24x18/${COUNTRY.toLowerCase()}.png`}
          />

          <Detail.Metadata.Separator />
          {gameSlug && (
            <Detail.Metadata.Link
              title=""
              target={`https://isthereanydeal.com/game/${gameSlug}/info/`}
              text="View on IsThereAnyDeal"
            />
          )}
          {steamData?.steam_appid && (
            <Detail.Metadata.Link
              title=""
              target={`https://store.steampowered.com/app/${steamData.steam_appid}`}
              text="View on Steam"
            />
          )}
          {lastChecked && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Data"
                text={`Cached · ${Math.floor((Date.now() - lastChecked) / 60000)} min ago`}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {currentBest?.url && (
              <Action.OpenInBrowser
                url={currentBest.url}
                title={`Open Best Deal (${currentBest.shop?.name})`}
                icon={Icon.Cart}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Game Name"
              content={gameTitle}
              shortcut={{
                Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
              }}
            />
            {currentBest?.url && (
              <Action.CopyToClipboard
                title="Copy Best Deal Link"
                content={currentBest.url}
                shortcut={{
                  Windows: { modifiers: ["ctrl"], key: "c" },
                  macOS: { modifiers: ["cmd"], key: "c" },
                }}
              />
            )}
            <ActionPanel.Submenu
              title="Change Chart Range"
              icon={Icon.BarChart}
            >
              <Action
                title="3 Months"
                onAction={() => handleSetRange("3m")}
                icon={range === "3m" ? Icon.Checkmark : Icon.Circle}
              />
              <Action
                title="6 Months"
                onAction={() => handleSetRange("6m")}
                icon={range === "6m" ? Icon.Checkmark : Icon.Circle}
              />
              <Action
                title="1 Year"
                onAction={() => handleSetRange("1y")}
                icon={range === "1y" ? Icon.Checkmark : Icon.Circle}
              />
            </ActionPanel.Submenu>
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{
                Windows: { modifiers: ["ctrl"], key: "r" },
                macOS: { modifiers: ["cmd"], key: "r" },
              }}
              onAction={() => {
                const c = new Cache({ namespace: "search_detail" });
                c.remove(`search_detail_${gameId}_${COUNTRY}_v1`);
                setIsLoading(true);
                setRefreshKey((k) => k + 1);
              }}
            />
            {realBundles.length > 0 && (
              <Action.Push
                title="View Bundle Contents"
                target={
                  <BundleContentViewer
                    bundles={realBundles}
                    gameTitle={gameTitle}
                  />
                }
                icon={Icon.Box}
                shortcut={{
                  Windows: { modifiers: ["ctrl"], key: "b" },
                  macOS: { modifiers: ["cmd"], key: "b" },
                }}
              />
            )}
            {toggleSave && (
              <Action
                title={isSaved ? "Remove from Saved" : "Save Game"}
                onAction={toggleSave}
                icon={isSaved ? Icon.Trash : Icon.Star}
                shortcut={{
                  Windows: { modifiers: ["ctrl"], key: "s" },
                  macOS: { modifiers: ["cmd"], key: "s" },
                }}
                style={
                  isSaved ? Action.Style.Destructive : Action.Style.Regular
                }
              />
            )}
            {removeGame && (
              <Action
                title="Remove from Saved"
                onAction={removeGame}
                icon={Icon.Trash}
                shortcut={{
                  Windows: { modifiers: ["ctrl"], key: "s" },
                  macOS: { modifiers: ["cmd"], key: "s" },
                }}
                style={Action.Style.Destructive}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function BundleContentViewer({ bundles, gameTitle }: any) {
  const firstBundleUrl = bundles?.[0]?.url || bundles?.[0]?.details;

  let markdown = `# 📦 Bundle Contents for ${gameTitle}\n\n`;
  bundles.forEach((b: any, i: number) => {
    const active = b.expiry ? new Date(b.expiry) > new Date() : true;
    markdown += `## ${active ? "✅" : "❌"} ${b.title || `Bundle ${i + 1}`}\n**Page:** ${b.page?.name || "Unknown"}${b.expiry ? ` | **Expires:** ${new Date(b.expiry).toLocaleDateString("en-GB")}` : ""}\n${b.note ? `\n> ${b.note}` : ""}\n\n`;
    b.tiers?.forEach((t: any, ti: number) => {
      markdown += `### ${t.name || `Tier ${ti + 1}`} - **${t.price ? formatPrice(t.price.amount, t.price.currency) : "N/A"}**\n`;
      t.games?.forEach(
        (g: any) => (markdown += `- ${g.title || g.name || g}\n`),
      );
      markdown += `\n`;
    });
  });
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Bundle Contents"
      actions={
        firstBundleUrl ? (
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Bundle Page"
              url={firstBundleUrl}
              icon={Icon.Globe}
            />
            <Action.CopyToClipboard
              title="Copy Bundle Link"
              content={firstBundleUrl}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
