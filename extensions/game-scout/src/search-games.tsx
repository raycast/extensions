import { useEffect, useState, useMemo } from "react";
import { showFailureToast } from "@raycast/utils";
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

const preferences = getPreferenceValues<Preferences.SearchGames>();

const API_KEY = (preferences.itadApiKey || "").trim();
const COUNTRY = preferences.country;
const MAX_RESULTS = parseInt(preferences.maxResults) || 25;

const detailCache = new Cache({ namespace: "search_detail" });
const DETAIL_CACHE_TTL = 6 * 60 * 60 * 1000;
const RECENT_BUNDLE_WINDOW = 2 * 365 * 24 * 60 * 60 * 1000;
const searchCache = new Cache({ namespace: "search_queries" });
const CACHE_KEY = `itad_saved_prices_v22_${COUNTRY}`;

const getBundleCount = (bundles: OverviewItem["bundles"] | undefined) => {
  if (typeof bundles === "number") {
    return bundles;
  }
  if (Array.isArray(bundles)) {
    return bundles.length;
  }
  return bundles?.count || 0;
};

import {
  formatPrice,
  isStoreAllowed,
  computeGameInsight,
  safeParse,
} from "./utils";
import type {
  BundleInfo,
  Deal,
  DetailData,
  GameSearchResult,
  HistoryPoint,
  OverviewItem,
  OverviewResponse,
  SavedGame,
  SteamAppDetailsResponse,
  SteamSearchItem,
  SteamSearchResponse,
} from "./types";

export default function Command() {
  const [apiError, setApiError] = useState(false);
  const isApiKeyValid = API_KEY.length > 0;
  const isCountryValid = COUNTRY.length === 2;

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState<GameSearchResult[]>([]);
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(
    null,
  );
  const [pricesData, setPricesData] = useState<Record<string, Deal[]>>({});
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>(["all"]);

  useEffect(() => {
    LocalStorage.getItem<string>("saved_itad_games").then((s) =>
      setSavedGames(safeParse(s, [])),
    );
    LocalStorage.getItem<string>("selected_stores").then((s) =>
      setSelectedStores(safeParse(s, ["all"])),
    );
  }, []);

  const toggleSave = async (game: GameSearchResult) => {
    let newList: SavedGame[];
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
    }
    setSavedGames(newList);
    await LocalStorage.setItem("saved_itad_games", JSON.stringify(newList));
    const savedCache = new Cache();
    savedCache.remove(CACHE_KEY);
  };

  useEffect(() => {
    if (!searchQuery) {
      setSearchData([]);
      setOverviewData(null);
      return;
    }
    const fetchData = async () => {
      setLoadingSearch(true);
      const cacheKey = `search_${COUNTRY}_${searchQuery}`;
      const cached = searchCache.get(cacheKey);

      if (cached) {
        const parsed = safeParse<{
          timestamp?: number;
          searchData?: GameSearchResult[];
          overviewData?: OverviewResponse | null;
          pricesData?: Record<string, Deal[]>;
        } | null>(cached, null);
        if (
          parsed &&
          parsed.timestamp &&
          Date.now() - parsed.timestamp < 1000 * 60 * 60
        ) {
          setSearchData(parsed.searchData || []);
          setOverviewData(parsed.overviewData || null);
          setPricesData(parsed.pricesData || {});
          setLoadingSearch(false);
          return;
        }
      }

      try {
        const res = await fetch(
          `https://api.isthereanydeal.com/games/search/v1?key=${API_KEY}&title=${encodeURIComponent(searchQuery)}`,
        );
        if (res.status === 401 || res.status === 403) {
          setApiError(true);
          setLoadingSearch(false);
          return;
        }
        const json = (await res.json()) as
          | { data?: GameSearchResult[]; results?: GameSearchResult[] }
          | GameSearchResult[];
        const results: GameSearchResult[] = Array.isArray(json)
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
        results.sort((a, b) => score(a.title) - score(b.title));

        const gameIds = results.slice(0, MAX_RESULTS).map((g) => g.id);
        let overview = null;
        let prices: Record<string, Deal[]> = {};
        let pricesFetched = false;
        gameIds.forEach((id) => {
          prices[String(id)] = [];
        });

        if (gameIds.length > 0) {
          try {
            const [oRes, pRes] = await Promise.all([
              fetch(
                `https://api.isthereanydeal.com/games/overview/v2?key=${API_KEY}&country=${COUNTRY}&nondeals=true`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(gameIds),
                },
              ),
              fetch(
                `https://api.isthereanydeal.com/games/prices/v2?key=${API_KEY}&country=${COUNTRY}&nondeals=true`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(gameIds),
                },
              ),
            ]);

            if (oRes.ok) overview = await oRes.json();
            if (pRes.ok) {
              pricesFetched = true;
              const pJson = await pRes.json();
              const pArray = Array.isArray(pJson)
                ? pJson
                : Object.values(pJson);
              pArray.forEach(
                (item: { id?: string | number; deals?: Deal[] }) => {
                  if (item.id) prices[String(item.id)] = item.deals || [];
                },
              );
            }
          } catch {
            // Silently catch overview/prices failures
          }
        }

        if (gameIds.length > 0 && cached) {
          const parsed = safeParse<{
            timestamp?: number;
            searchData?: GameSearchResult[];
            overviewData?: OverviewResponse | null;
            pricesData?: Record<string, Deal[]>;
          } | null>(cached, null);
          if (parsed) {
            if (!overview) overview = parsed.overviewData || null;
            if (!pricesFetched) prices = parsed.pricesData || prices;
          }
        }

        setSearchData(results);
        setOverviewData(overview);
        setPricesData(prices);

        if (
          overview ||
          Object.keys(prices).length > 0 ||
          gameIds.length === 0
        ) {
          searchCache.set(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              searchData: results,
              overviewData: overview,
              pricesData: prices,
            }),
          );
        }
      } catch (error) {
        setSearchData([]);
        setOverviewData(null);
        setPricesData({});
        await showFailureToast(error, {
          title: "Failed to search games",
        });
      }
      setLoadingSearch(false);
    };
    fetchData();
  }, [searchQuery]);

  const activeBundleMap = useMemo(() => {
    const map: Record<string, number> = {};
    const data = overviewData as {
      bundles?: {
        expiry?: string;
        tiers?: { games?: { id?: string | number }[] }[];
      }[];
    } | null;
    if (!data?.bundles) return map;
    const now = new Date();
    for (const bundle of data.bundles) {
      const isActive = !bundle.expiry || new Date(bundle.expiry) > now;
      if (!isActive) continue;
      const games =
        bundle.tiers?.flatMap(
          (tier: { games?: { id?: string | number }[] }) => tier.games || [],
        ) || [];
      const uniqueGameIds = new Set(games.map((g) => String(g.id)));
      for (const gid of uniqueGameIds) {
        if (gid && gid !== "undefined") {
          map[gid] = (map[gid] || 0) + 1;
        }
      }
    }
    return map;
  }, [overviewData]);

  const filteredData = searchData.filter((game) => {
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
      {!isApiKeyValid || !isCountryValid ? (
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
      ) : apiError ? (
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
        filteredData.slice(0, MAX_RESULTS).map((game) => {
          const data = overviewData as {
            prices?: { id?: string | number }[];
            bundles?: BundleInfo[];
          } | null;
          const overviewItem = data?.prices?.find(
            (p) => String(p.id) === game.id,
          );

          const validDeals = (pricesData[game.id] || []).filter((d: Deal) =>
            isStoreAllowed(d.shop?.name || "", selectedStores),
          );
          const deal = validDeals.reduce<Deal | null>((min, d) => {
            if (!min) return d;
            return d.price.amount < min.price.amount ? d : min;
          }, null);

          const isSaved = savedGames.some((g) => g.id === game.id);

          const accessories = [];
          if (game.mature)
            accessories.push({
              tag: { value: "18+", color: Color.Red },
              tooltip: "Mature Content",
            });

          const bundleCount = activeBundleMap[game.id] || 0;
          if (bundleCount > 0) {
            accessories.push({
              icon: { source: Icon.Box, tintColor: Color.Purple },
              tooltip: `In ${bundleCount} active bundle${bundleCount > 1 ? "s" : ""}`,
            });
          }

          if (loadingSearch && !deal) {
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
          } else {
            accessories.push({ text: "NO INFO" });
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
                  ? { source: Icon.Star, tintColor: Color.Yellow }
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
                            preloadedDeals={pricesData[game.id]}
                            preloadedOverview={
                              overviewItem
                                ? {
                                    prices: [overviewItem],
                                    bundles:
                                      (
                                        overviewData as {
                                          bundles?: BundleInfo[];
                                        }
                                      )?.bundles?.filter((b) =>
                                        b.tiers?.some((t) =>
                                          t.games?.some(
                                            (g) =>
                                              String(g.id) === String(game.id),
                                          ),
                                        ),
                                      ) || [],
                                  }
                                : null
                            }
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

interface GameDetailProps {
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  gameType: string;
  isSaved?: boolean;
  toggleSave?: () => void;
  removeGame?: () => void;
  preloadedDeals?: Deal[];
  preloadedOverview?:
    | { prices?: OverviewItem[]; bundles?: BundleInfo[] }
    | OverviewItem
    | null;
}

function GameDetail({
  gameId,
  gameTitle,
  gameSlug,
  gameType,
  isSaved,
  toggleSave,
  removeGame,
  preloadedDeals,
  preloadedOverview,
}: GameDetailProps) {
  const [data, setData] = useState<DetailData>({
    steamData: null,
    realBundles: [],
    deals: preloadedDeals || [],
    historyLow: null,
    overview: preloadedOverview || null,
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
      setSelectedStores(safeParse(s, ["all"])),
    );
    LocalStorage.getItem<string>("preferred_chart_range").then((saved) => {
      if (saved === "3m" || saved === "6m" || saved === "1y") {
        setRange(saved);
      } else {
        setRange("1y");
        LocalStorage.setItem("preferred_chart_range", "1y");
      }
    });
  }, [refreshKey]);

  const handleSetRange = (r: "3m" | "6m" | "1y") => {
    setRange(r);
    LocalStorage.setItem("preferred_chart_range", r);
  };

  useEffect(() => {
    let isMounted = true;
    const abort = new AbortController();
    const detailCacheKey = `search_detail_${gameId}_${COUNTRY}_${SHOW_CHART ? "chart" : "nochart"}_v1`;

    const fetchDetailData = async () => {
      setIsLoading(true);
      const cached = detailCache.get(detailCacheKey);
      if (cached) {
        const parsed = safeParse<{
          timestamp?: number;
          data?: DetailData;
        } | null>(cached, null);
        if (
          parsed &&
          parsed.timestamp &&
          Date.now() - parsed.timestamp < DETAIL_CACHE_TTL
        ) {
          if (isMounted) {
            if (!parsed.data) return;
            const d = parsed.data;
            setData({
              steamData: d.steamData ?? null,
              realBundles: d.realBundles ?? [],
              deals: d.deals ?? [],
              historyLow: d.historyLow ?? null,
              overview: d.overview ?? null,
              historyChart: d.historyChart ?? [],
              lastChecked: parsed.timestamp ?? null,
            });
            setIsLoading(false);
          }
          return;
        }
      }

      try {
        const searchRes = await fetch(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameTitle)}&l=english&cc=${COUNTRY}`,
          { signal: abort.signal },
        );
        const searchJson = (await searchRes.json()) as SteamSearchResponse;

        let targetItem = searchJson?.items?.find(
          (item: SteamSearchItem) =>
            item.name.toLowerCase() === gameTitle.toLowerCase(),
        );
        if (!targetItem) {
          targetItem = searchJson?.items?.find((item: SteamSearchItem) => {
            const sName = item.name.toLowerCase();
            const iName = gameTitle.toLowerCase();
            if (sName.includes(iName) || iName.includes(sName)) {
              const sNums: string[] = sName.match(/\b\d+\b/g) || [];
              const iNums: string[] = iName.match(/\b\d+\b/g) || [];
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
          const steamJson = (await detailRes.json()) as SteamAppDetailsResponse;
          steamData = steamJson?.[String(targetItem.id)]?.data || null;
        }

        const mockResponse = (mockData: unknown) =>
          Promise.resolve({
            json: () => Promise.resolve(mockData),
          } as Response);

        const fetchPromises = [
          fetch(
            `https://api.isthereanydeal.com/games/bundles/v2?key=${API_KEY}&id=${gameId}`,
            { signal: abort.signal },
          ),
          preloadedDeals != null
            ? mockResponse([{ deals: preloadedDeals }])
            : fetch(
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
          preloadedOverview != null
            ? mockResponse([preloadedOverview])
            : fetch(
                `https://api.isthereanydeal.com/games/overview/v2?key=${API_KEY}&country=${COUNTRY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify([gameId]),
                  signal: abort.signal,
                },
              ),
        ];
        if (SHOW_CHART) {
          const rawDate = new Date(
            Date.now() - 400 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const historySince = encodeURIComponent(rawDate.split(".")[0] + "Z");

          fetchPromises.push(
            fetch(
              `https://api.isthereanydeal.com/games/history/v2?key=${API_KEY}&id=${gameId}&country=${COUNTRY}&since=${historySince}`,
              { signal: abort.signal },
            ),
          );
        }

        const jsons = await Promise.all(
          (await Promise.all(fetchPromises)).map((r) => r.json()),
        );
        const [
          bundlesJson,
          pricesJson,
          historyLowJson,
          overviewJson,
          historyChartJson,
        ] = jsons;

        const combined = {
          steamData,
          realBundles: Array.isArray(bundlesJson)
            ? bundlesJson
            : bundlesJson?.[gameId]?.bundles || [],
          deals:
            (Array.isArray(pricesJson)
              ? pricesJson[0]?.deals
              : pricesJson?.[gameId]?.deals) || [],
          historyLow:
            (Array.isArray(historyLowJson)
              ? historyLowJson[0]?.low
              : historyLowJson?.[gameId]?.low) || null,
          overview: Array.isArray(overviewJson)
            ? overviewJson[0]
            : overviewJson,
          historyChart:
            SHOW_CHART && Array.isArray(historyChartJson)
              ? historyChartJson
              : [],
        };

        if (isMounted) {
          detailCache.set(
            detailCacheKey,
            JSON.stringify({ timestamp: Date.now(), data: combined }),
          );
          setData({ ...combined, lastChecked: Date.now() });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        await showFailureToast(error, {
          title: `Failed to load details for ${gameTitle}`,
        });
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
    const isBundleActive = (b: BundleInfo) => {
      if (!b?.expiry) return true;
      const t = new Date(b.expiry).getTime();
      return Number.isFinite(t) && t > now;
    };

    const activeBundles = realBundles.filter(isBundleActive);
    const activeCount = activeBundles.length;

    const recentBundles = realBundles.filter((b: BundleInfo) => {
      const tsRaw = b.created ?? b.timestamp;
      const ts = tsRaw ? new Date(tsRaw).getTime() : null;
      return ts && ts < now && now - ts < RECENT_BUNDLE_WINDOW;
    });

    const totalBundles =
      realBundles?.length > 0
        ? realBundles.length
        : getBundleCount(overview?.bundles);

    const allBundlesForTs = Array.isArray(overview?.bundles)
      ? overview.bundles
      : realBundles;

    const timestamps = allBundlesForTs
      .map((b: BundleInfo) => {
        const ts = b.created ?? b.timestamp ?? b.publish ?? b.expiry;
        return ts ? new Date(ts).getTime() : null;
      })
      .filter((t): t is number => t !== null && !isNaN(t));

    const lastBundleTs =
      timestamps.length > 0 ? Math.max(...timestamps) : undefined;
    const lastBundleDate = lastBundleTs ? new Date(lastBundleTs) : null;

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
    } else if (lastBundleDate) {
      const month = lastBundleDate.toLocaleString("en-US", { month: "short" });
      const year = lastBundleDate.getFullYear();
      const dateStr = `${month} ${year}`;

      if (totalBundles === 1) {
        state = `Once • ${dateStr}`;
        icon = Icon.Circle;
        color = Color.SecondaryText;
      } else {
        state = `${totalBundles}× • Last ${dateStr}`;

        if (recentBundles.length >= 4) {
          icon = Icon.Repeat;
          color = Color.Orange;
        } else {
          icon = Icon.Box;
          color = Color.SecondaryText;
        }
      }
    }

    const getLowestPrice = (bundle: BundleInfo) => {
      const prices = bundle.tiers
        ?.map((t) => t.price?.amount)
        .filter((p: number | undefined) => typeof p === "number");
      return prices?.length ? Math.min(...prices) : Infinity;
    };

    const featuredBundle =
      activeBundles.length > 0
        ? activeBundles.reduce(
            (best: BundleInfo, current: BundleInfo) =>
              getLowestPrice(current) < getLowestPrice(best) ? current : best,
            activeBundles[0],
          )
        : null;

    const featuredPrice = featuredBundle
      ? getLowestPrice(featuredBundle)
      : null;

    const getGameTierPrice = (b: BundleInfo) => {
      const tiersWithGame = b.tiers?.filter((t) =>
        t.games?.some((gm) => String(gm.id) === gameId),
      );
      if (tiersWithGame && tiersWithGame.length > 0) {
        const prices = tiersWithGame
          .map((t) => t.price?.amount)
          .filter((p): p is number => typeof p === "number");
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
      (pt: HistoryPoint) =>
        pt.deal?.price?.amount != null &&
        isStoreAllowed(pt.shop?.name || "", selectedStores),
    );
  }, [historyChart, selectedStores]);

  const filteredDeals = deals.filter((d: Deal) =>
    isStoreAllowed(d.shop?.name || "", selectedStores),
  );
  const currentBest = filteredDeals?.[0];
  const currentPrice = currentBest?.price?.amount;

  const bundleValue = useMemo(() => {
    if (!bundle.activeBundles.length || currentPrice == null) return null;

    for (const b of bundle.activeBundles) {
      let gameTierIndex = -1;
      b.tiers?.forEach((t, i: number) => {
        if (
          t.games?.some(
            (gm) => String(gm.id) === gameId || gm.name === gameTitle,
          )
        ) {
          gameTierIndex = i;
        }
      });

      if (gameTierIndex === -1) continue;

      const tierPrice = b.tiers[gameTierIndex]?.price?.amount;
      if (!tierPrice) continue;

      if (tierPrice < currentPrice) {
        return {
          type: "better" as const,
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
          type: "value" as const,
          message: "Better value in bundle",
          tier: b.tiers[gameTierIndex],
          bundle: b,
        };
      }
    }
    return null;
  }, [bundle.activeBundles, currentPrice, gameId, gameTitle]);

  const allTimeLow = historyLow?.price?.amount ?? historyLow?.amount ?? null;
  const hCurrency =
    historyLow?.price?.currency ?? historyLow?.currency ?? "USD";

  // --- signal & insight system ---
  const twelveMonthTime = now - 365 * 24 * 60 * 60 * 1000;
  const {
    signalText,
    signalIcon,
    signalColor,
    primaryInsight,
    secondaryInsight,
    medianSale,
    primaryIsPositive,
    secondaryIsPositive,
    primaryIsNeutral,
    secondaryIsNeutral,
  } = computeGameInsight({
    currentPrice,
    statsPrices: allowedHistory
      .filter((pt) => new Date(pt.timestamp).getTime() >= twelveMonthTime)
      .map((pt) => pt.deal?.price?.amount ?? 0),
    allTimeLow,
    allowedHistory,
    currentBest,
    bundleValue,
    dataMonths: 0,
    range,
    isLoading,
  });

  const plotData: Array<{ x: string; y: number }> = [];
  const cutoffTime =
    now -
    (range === "3m" ? 90 : range === "6m" ? 180 : 365) * 24 * 60 * 60 * 1000;
  if (allowedHistory.length > 0) {
    allowedHistory
      .filter((pt) => new Date(pt.timestamp).getTime() >= cutoffTime)
      .reverse()
      .forEach((pt) => {
        const amount = pt.deal?.price?.amount;
        if (amount == null) {
          return;
        }
        plotData.push({
          x: new Date(pt.timestamp).toISOString().split("T")[0],
          y: amount,
        });
      });
  }

  let chartUrl = "";
  if (SHOW_CHART && plotData.length > 0) {
    const minY = Math.min(...plotData.map((p) => p.y));
    const datasets: Array<Record<string, unknown>> = [
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

    if (medianSale !== null) {
      datasets.push({
        data: plotData.map((p) => ({ x: p.x, y: medianSale })),
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      });
    }

    const config: Record<string, unknown> = {
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
                content:
                  range === "1y"
                    ? "1Y Low"
                    : range === "6m"
                      ? "6M Low"
                      : "3M Low",
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

  const steamCut = steamData?.price_overview?.discount_percent ?? 0;
  const effectiveCut = Math.max(currentBest?.cut ?? 0, steamCut);
  const isDiscounted = effectiveCut > 0;
  let saleTagText = "";
  let saleTagColor = Color.Green;
  if (isDiscounted) {
    if (effectiveCut >= 70) {
      saleTagText = "MEGA SALE";
      saleTagColor = Color.Green;
    } else if (effectiveCut >= 40) {
      saleTagText = "ON SALE";
      saleTagColor = Color.Green;
    } else if (effectiveCut >= 20) {
      saleTagText = "DISCOUNT";
      saleTagColor = Color.SecondaryText;
    } else {
      saleTagText = "LOW DISCOUNT";
      saleTagColor = Color.SecondaryText;
    }
  }

  const signalEmoji =
    signalText === "STRONG OPPORTUNITY"
      ? "👍"
      : signalText === "GOOD OPPORTUNITY"
        ? "🟢"
        : signalText === "AVERAGE TIMING"
          ? "🟡"
          : signalText === "WEAK OPPORTUNITY"
            ? "🟠"
            : signalText === "POOR OPPORTUNITY"
              ? "❌"
              : signalText === "CHEAPER IN BUNDLE"
                ? "📦"
                : signalText === "FREE TO CLAIM"
                  ? "🎁"
                  : signalText === "FREE TO PLAY"
                    ? "🆓"
                    : signalText === "NEVER ON SALE" ||
                        signalText === "NO RECENT DISCOUNTS"
                      ? "⏱️"
                      : "";

  const isUnreleased = (steamData?.release_date as { coming_soon?: boolean })
    ?.coming_soon;
  const releaseDateText = steamData?.release_date?.date;

  let heroSection = "";
  if (currentBest && currentPrice != null) {
    heroSection = `<h2 align="center">${signalText !== "INSUFFICIENT DATA" ? `${signalEmoji} ${signalText}` : ""}</h2>\n<h3 align="center">${formatPrice(currentPrice, currentBest.price?.currency)} ${isDiscounted ? `<code>-${effectiveCut}%</code>` : ""} · ${currentBest.shop?.name}</h3>\n\n---\n\n`;
  } else if (isUnreleased) {
    heroSection = `<h2 align="center">⏱️ UNRELEASED</h2>\n<h3 align="center">Expected: ${releaseDateText || "TBA"}</h3>\n\n---\n\n`;
  } else {
    heroSection = `<h2 align="center">🤷‍♂️ NO INFO</h2>\n<h3 align="center">No store listings found</h3>\n\n---\n\n`;
  }

  const hasInsights = !!(signalText || primaryInsight || secondaryInsight);
  const hasTags = !!(isDiscounted || bundle.activeCount > 0);
  const hideHistoricalData = isUnreleased && currentPrice == null;
  const hasHistorical = !hideHistoricalData;

  const markdown = `
  
${steamData?.header_image ? `<img src="${steamData.header_image}" width="280" />\n\n` : ""}
# ${gameTitle}
${
  steamData?.genres
    ? `*${steamData.genres
        .map((g) => g.description)
        .slice(0, 2)
        .join(
          ", ",
        )}*${steamData?.release_date?.date ? ` · ${Number.isNaN(new Date(steamData.release_date.date).getFullYear()) ? steamData.release_date.date : new Date(steamData.release_date.date).getFullYear()}` : ""}`
    : ""
}

${steamData?.short_description ? `> ${steamData.short_description.replace(/<[^>]*>?/gm, "").split(". ")[0]}.` : ""}

${heroSection}
💰 **Prices in ${COUNTRY}**

| Store | Price | RRP | Discount |
| :--- | :--- | :--- | :--- |
${filteredDeals?.length ? filteredDeals.map((p) => `| ${p.url ? `[${p.shop?.name}](${p.url})` : p.shop?.name} | **${formatPrice(p.price?.amount, p.price?.currency)}** | ${formatPrice(p.regular?.amount, p.price?.currency)} | ${p.cut && p.cut > 0 ? "-" + p.cut + "%" : "-"} |`).join("\n") : isUnreleased ? `| ${releaseDateText || "TBA"} | - | - | - |` : "| No info | - | - | - |"}

${chartUrl ? `\n---\n\n📈 **Trend: ${range === "1y" ? "12 Months" : range === "6m" ? "6 Months" : "3 Months"}**\n\n![Price History](${chartUrl})\n` : ""}
`;

  const tinyPlusGreen =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M11 9h4M13 7v4" stroke="%232ecc71" stroke-width="2" stroke-linecap="round"/></svg>';
  const tinyMinusRed =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M11 9h4" stroke="%23e74c3c" stroke-width="2" stroke-linecap="round"/></svg>';
  const tinyNeutralGrey =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="13" cy="9" r="2" fill="%23888888"/></svg>';

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={gameTitle}
      metadata={
        <Detail.Metadata>
          {signalText && signalText !== "INSUFFICIENT DATA" && (
            <Detail.Metadata.Label
              title="Signal"
              text={signalText}
              icon={{ source: signalIcon, tintColor: signalColor }}
            />
          )}
          {primaryInsight && (
            <Detail.Metadata.Label
              title=""
              text={primaryInsight}
              icon={
                primaryIsPositive
                  ? tinyPlusGreen
                  : primaryIsNeutral
                    ? tinyNeutralGrey
                    : tinyMinusRed
              }
            />
          )}
          {secondaryInsight && (
            <Detail.Metadata.Label
              title=""
              text={secondaryInsight}
              icon={
                secondaryIsPositive
                  ? tinyPlusGreen
                  : secondaryIsNeutral
                    ? tinyNeutralGrey
                    : tinyMinusRed
              }
            />
          )}

          {hasTags && (
            <>
              {hasInsights && <Detail.Metadata.Separator />}
              <Detail.Metadata.TagList title="Tags">
                {isDiscounted && (
                  <Detail.Metadata.TagList.Item
                    text={saleTagText}
                    color={saleTagColor}
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

          {hasHistorical && (
            <>
              {(hasInsights || hasTags) && <Detail.Metadata.Separator />}
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
              {medianSale !== null && (
                <Detail.Metadata.Label
                  title="Median Price (1Y)"
                  text={formatPrice(medianSale, hCurrency)}
                />
              )}

              {bundle.state && (
                <>
                  <Detail.Metadata.Separator />
                  {bundle.icon ? (
                    <Detail.Metadata.Label
                      title="Bundle Status"
                      text={bundle.state}
                      icon={{
                        source: bundle.icon as Icon,
                        tintColor: bundle.color,
                      }}
                    />
                  ) : (
                    <Detail.Metadata.Label
                      title="Bundle Status"
                      text={bundle.state}
                    />
                  )}
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
            </>
          )}

          {(hasInsights || hasTags || hasHistorical) && (
            <Detail.Metadata.Separator />
          )}
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
                detailCache.remove(
                  `search_detail_${gameId}_${COUNTRY}_${SHOW_CHART ? "chart" : "nochart"}_v1`,
                );
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

function BundleContentViewer({
  bundles,
  gameTitle,
}: {
  bundles: BundleInfo[];
  gameTitle: string;
}) {
  const firstBundleUrl = bundles?.[0]?.url || bundles?.[0]?.details;

  let markdown = `# 📦 Bundle Contents for ${gameTitle}\n\n`;
  bundles.forEach((b, i: number) => {
    const active = b.expiry ? new Date(b.expiry) > new Date() : true;
    markdown += `## ${active ? "✅" : "❌"} ${b.title || `Bundle ${i + 1}`}\n**Page:** ${b.page?.name || "Unknown"}${b.expiry ? ` | **Expires:** ${new Date(b.expiry).toLocaleDateString("en-GB")}` : ""}\n${b.note ? `\n> ${b.note}` : ""}\n\n`;
    b.tiers?.forEach((t, ti: number) => {
      markdown += `### ${t.name || `Tier ${ti + 1}`} - **${t.price ? formatPrice(t.price.amount, t.price.currency) : "N/A"}**\n`;
      t.games?.forEach(
        (g) => (markdown += `- ${g.title || g.name || String(g.id || "")}\n`),
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
