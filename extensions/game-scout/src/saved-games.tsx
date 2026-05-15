// TODO: Add 24h timestamp to referencePrices for time-based price change tags

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
  getPreferenceValues,
  Cache,
  openExtensionPreferences,
  Image,
} from "@raycast/api";

const preferences = getPreferenceValues<Preferences.SavedGames>();

const API_KEY = (preferences.itadApiKey || "").trim();
const COUNTRY = preferences.country;

const cache = new Cache();
const CACHE_KEY = `itad_saved_prices_v1_${COUNTRY}`;
const CACHE_TTL =
  parseInt(preferences.refreshFrequency || "12") * 60 * 60 * 1000;
const detailCache = new Cache({ namespace: "search_detail" });
const DETAIL_CACHE_TTL = 6 * 60 * 60 * 1000;
const RECENT_BUNDLE_WINDOW = 2 * 365 * 24 * 60 * 60 * 1000;

import { formatPrice, isStoreAllowed, computeGameInsight } from "./utils";
import type {
  BundleInfo,
  Deal,
  DetailData,
  HistoryPoint,
  OverviewResponse,
  SavedGame,
  SteamAppDetailsResponse,
  SteamSearchItem,
  SteamSearchResponse,
} from "./types";
import { flattenOverviewResponse } from "./types";

const getBundleCount = (
  bundles: BundleInfo[] | { count?: number } | number | undefined,
) => {
  if (typeof bundles === "number") {
    return bundles;
  }
  if (Array.isArray(bundles)) {
    return bundles.length;
  }
  return bundles?.count || 0;
};

export default function SavedGames() {
  const isApiKeyValid = API_KEY.length > 0;

  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [rawPrices, setRawPrices] = useState<Record<string, Deal[]>>({});
  const [bundleCounts, setBundleCounts] = useState<Record<string, number>>({});
  const [referencePrices, setReferencePrices] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStores, setSelectedStores] = useState<string[]>(["all"]);
  const [filterMode, setFilterMode] = useState<string>("default");

  useEffect(() => {
    LocalStorage.getItem<string>("selected_stores").then((s) =>
      setSelectedStores(s ? JSON.parse(s) : ["all"]),
    );
    LocalStorage.getItem<string>("saved_itad_games").then((s) =>
      s ? setSavedGames(JSON.parse(s)) : setIsLoading(false),
    );
    LocalStorage.getItem<string>("last_seen_prices").then(
      (s) => s && setReferencePrices(JSON.parse(s)),
    );
  }, []);

  const fetchPrices = async (signal?: AbortSignal) => {
    if (savedGames.length === 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const cachedData = cache.get(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setRawPrices(parsed.rawPrices);
          setBundleCounts(parsed.bundleCounts);
          setIsLoading(false);
          return;
        }
      }

      const gameIds = savedGames.map((g) => g.id);
      const [pRes, oRes] = await Promise.all([
        fetch(
          `https://api.isthereanydeal.com/games/prices/v2?key=${API_KEY}&country=${COUNTRY}&nondeals=true`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(gameIds),
            signal,
          },
        ),
        fetch(
          `https://api.isthereanydeal.com/games/overview/v2?key=${API_KEY}&country=${COUNTRY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(gameIds),
            signal,
          },
        ),
      ]);

      const [pJson, oJson] = await Promise.all([pRes.json(), oRes.json()]);

      const priceMap: Record<string, Deal[]> = {};
      const lastSeenPrices: Record<string, number> = {};

      const priceEntries: Array<{ id?: string | number; deals?: Deal[] }> =
        Array.isArray(pJson)
          ? (pJson as Array<{ id?: string | number; deals?: Deal[] }>)
          : Object.values(
              pJson as Record<string, { id?: string | number; deals?: Deal[] }>,
            );

      priceEntries.forEach((it) => {
        if (it.id == null) return;
        const id = String(it.id);

        priceMap[id] = it.deals || [];

        const validDeals = it.deals?.filter((d) =>
          isStoreAllowed(d.shop?.name || "", selectedStores),
        );

        const bestDeal = validDeals?.reduce<Deal | null>((min, d) => {
          if (!min) return d;
          return d.price.amount < min.price.amount ? d : min;
        }, null);

        if (bestDeal?.price.amount != null) {
          lastSeenPrices[id] = bestDeal.price.amount;
        }
      });

      const oFlat = flattenOverviewResponse(oJson as OverviewResponse);

      const newBundleCounts: Record<string, number> = {};
      oFlat.forEach((item) => {
        const count = getBundleCount(item.bundles);
        if (item?.id && count > 0) {
          newBundleCounts[String(item.id)] = count;
        }
      });

      setRawPrices(priceMap);
      setBundleCounts(newBundleCounts);

      if (Object.keys(priceMap).length > 0) {
        cache.set(
          CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            rawPrices: priceMap,
            bundleCounts: newBundleCounts,
          }),
        );
      }

      const existing = await LocalStorage.getItem<string>("last_seen_prices");
      const parsed = existing ? JSON.parse(existing) : {};
      const merged = { ...parsed, ...lastSeenPrices };

      await LocalStorage.setItem("last_seen_prices", JSON.stringify(merged));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      await showFailureToast(error, {
        title: "Failed to refresh saved game prices",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const abort = new AbortController();
    fetchPrices(abort.signal);

    return () => {
      abort.abort();
    };
  }, [savedGames, selectedStores]);

  const prices = useMemo(() => {
    const map: Record<string, Deal | null> = {};
    Object.keys(rawPrices).forEach((rawId) => {
      const id = String(rawId);
      if (!rawPrices[id] || !Array.isArray(rawPrices[id])) {
        map[id] = null;
        return;
      }

      const validDeals = rawPrices[id].filter((d) =>
        isStoreAllowed(d.shop?.name || "", selectedStores),
      );

      map[id] = validDeals.reduce<Deal | null>((min, d) => {
        if (!min) return d;
        return d.price.amount < min.price.amount ? d : min;
      }, null);
    });
    return map;
  }, [rawPrices, selectedStores]);

  const scoreGame = (id: string) => {
    const deal = prices[id];
    if (!deal) return -999;
    const cut = deal.cut ?? 0;
    const bundle = bundleCounts[id] ?? 0;
    return cut + (bundle > 0 ? 20 : 0); // higher weight for bundles
  };

  const sortedAndFilteredGames = useMemo(() => {
    let list = [...savedGames];
    if (filterMode === "default" || !filterMode) {
      list.reverse(); // most recently saved first
    }
    if (filterMode === "deals") {
      list = list.filter((g) => prices[g.id] && (prices[g.id]?.cut || 0) > 0);
    } else if (filterMode === "discount") {
      list.sort((a, b) => (prices[b.id]?.cut || 0) - (prices[a.id]?.cut || 0));
    } else if (filterMode === "opportunity") {
      list.sort((a, b) => scoreGame(b.id) - scoreGame(a.id));
    } else if (filterMode === "lowest") {
      list.sort((a, b) => {
        const pA = prices[a.id]?.price?.amount ?? 999999;
        const pB = prices[b.id]?.price?.amount ?? 999999;
        return pA - pB;
      });
    }
    return list;
  }, [savedGames, prices, filterMode]);

  const removeGame = async (id: string) => {
    const newList = savedGames.filter((g) => g.id !== id);
    setSavedGames(newList);
    await LocalStorage.setItem("saved_itad_games", JSON.stringify(newList));
    cache.remove(CACHE_KEY);
  };

  const majorDrops = savedGames.filter((game) => {
    const last = referencePrices[game.id];
    const current = prices[game.id]?.price?.amount;
    if (last == null || current == null || last === 0) return false;
    const diff = ((current - last) / last) * 100;
    return diff <= -10;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved games..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter & Sort" onChange={setFilterMode}>
          <List.Dropdown.Item title="Recently Saved" value="default" />
          <List.Dropdown.Item title="Only Deals" value="deals" />
          <List.Dropdown.Item title="Biggest Discount" value="discount" />
          <List.Dropdown.Item title="Lowest Price" value="lowest" />
          <List.Dropdown.Item title="Best Opportunities" value="opportunity" />
        </List.Dropdown>
      }
    >
      {!isApiKeyValid ? (
        <List.EmptyView
          title="API Key Required"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : savedGames.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No saved games yet"
          description="Search games and save them for tracking."
          icon={Icon.Star}
        />
      ) : (
        <>
          {majorDrops.length > 0 && filterMode === "default" && (
            <List.Item title="" subtitle="──────────────" />
          )}
          {majorDrops.length > 0 && filterMode === "default" && (
            <List.Section title={`🔥 ${majorDrops.length} Price Drops`}>
              {sortedAndFilteredGames
                .filter((g) => majorDrops.some((d) => d.id === g.id))
                .map((game) => {
                  const deal = prices[game.id];
                  if (!deal) {
                    return null;
                  }
                  const currentAmount = deal.price?.amount ?? 0;
                  const diff =
                    ((currentAmount - referencePrices[game.id]) /
                      referencePrices[game.id]) *
                    100;
                  return (
                    <List.Item
                      key={`drop-${game.id}`}
                      title={game.title}
                      icon={Icon.Star}
                      accessories={[
                        {
                          text: `${formatPrice(deal.regular?.amount, deal.price?.currency)} → ${formatPrice(currentAmount, deal.price?.currency)}`,
                        },
                        {
                          tag: {
                            value: `🔻 ${Math.abs(diff).toFixed(0)}%`,
                            color: Color.Green,
                          },
                        },
                      ]}
                      actions={
                        <ActionPanel>
                          <Action.Push
                            title="View Game Details"
                            target={
                              <GameDetail
                                gameId={game.id}
                                gameTitle={game.title}
                                gameSlug={game.slug}
                                gameType={game.type || "OTHER"}
                                removeGame={() => removeGame(game.id)}
                              />
                            }
                            icon={Icon.Sidebar}
                          />
                        </ActionPanel>
                      }
                    />
                  );
                })}
            </List.Section>
          )}
          <List.Section
            title={
              majorDrops.length > 0 && filterMode === "default"
                ? "Other Saved Games"
                : undefined
            }
          >
            {sortedAndFilteredGames
              .filter(
                (g) =>
                  filterMode !== "default" ||
                  !majorDrops.some((d) => d.id === g.id),
              )
              .map((game) => {
                const deal = prices[game.id];
                const acc = [];

                if (!deal && isLoading) {
                  acc.push({
                    icon: Icon.Clock,
                    tooltip: "Loading price...",
                    tintColor: Color.SecondaryText,
                  });
                } else if (deal) {
                  const currentPrice = deal.price?.amount;
                  if (bundleCounts[String(game.id)] > 0) {
                    acc.push({
                      icon: { source: Icon.Box, tintColor: Color.Purple },
                      tooltip: "Available in a Bundle",
                    });
                  }
                  const lastPrice = referencePrices[game.id];

                  if (lastPrice != null && currentPrice !== lastPrice) {
                    const diffAbs = currentPrice - lastPrice;
                    const diffPct =
                      lastPrice === 0 ? 100 : (diffAbs / lastPrice) * 100;

                    if (Math.abs(diffPct) >= 3) {
                      let label = "";
                      if (diffPct <= -10) label = "🔥 DROP";
                      else if (diffPct < 0) label = "⬇ DOWN";
                      else if (diffPct >= 10) label = "⚠️ SPIKE";
                      else label = "⬆ UP";

                      acc.push({
                        tag: {
                          value: `${label} ${diffPct > 0 ? "+" : ""}${diffPct.toFixed(0)}%`,
                          color: diffPct > 0 ? Color.Red : Color.Green,
                        },
                      });
                    }
                  }

                  const regularPrice = deal.regular?.amount;
                  const currency = deal.price?.currency;
                  const cut = deal.cut || 0;

                  if (
                    cut > 0 &&
                    regularPrice != null &&
                    regularPrice > currentPrice
                  ) {
                    acc.push({
                      text: `${formatPrice(regularPrice, currency)} → ${formatPrice(currentPrice, currency)}`,
                    });
                  } else {
                    acc.push({ text: formatPrice(currentPrice, currency) });
                  }

                  if (cut > 0) {
                    acc.push({
                      tag: { value: `-${cut}%`, color: Color.Green },
                    });
                  }
                }
                const isMusic =
                  (!game.type ||
                    game.type === "dlc" ||
                    game.type === "OTHER") &&
                  (game.title?.toLowerCase().endsWith(" ost") ||
                    game.title?.toLowerCase().includes("soundtrack"));
                const cleanType = isMusic
                  ? "SOUNDTRACK"
                  : game.type === "game" || game.type === "base"
                    ? undefined
                    : game.type?.toUpperCase() || undefined;

                let listIcon: List.Item.Props["icon"] = {
                  source: Icon.Star,
                  tintColor: Color.Yellow,
                };
                if ((deal?.cut || 0) > 0) {
                  if ((deal?.cut || 0) >= 70) {
                    listIcon = { source: Icon.Star, tintColor: Color.Red };
                  } else {
                    listIcon = { source: Icon.Star, tintColor: Color.Orange };
                  }
                }

                return (
                  <List.Item
                    key={game.id}
                    title={game.title}
                    icon={listIcon}
                    subtitle={cleanType}
                    accessories={acc}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action.Push
                            title="View Game Details"
                            target={
                              <GameDetail
                                gameId={game.id}
                                gameTitle={game.title}
                                gameSlug={game.slug}
                                gameType={game.type || "OTHER"}
                                removeGame={() => removeGame(game.id)}
                              />
                            }
                            icon={Icon.Sidebar}
                          />
                          {deal?.url && (
                            <Action.OpenInBrowser
                              title="Open Best Deal"
                              url={deal.url}
                              icon={Icon.Cart}
                            />
                          )}
                        </ActionPanel.Section>
                        <ActionPanel.Section>
                          <Action
                            title="Remove from Saved"
                            onAction={() => removeGame(game.id)}
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{
                              Windows: { modifiers: ["ctrl"], key: "s" },
                              macOS: { modifiers: ["cmd"], key: "s" },
                            }}
                          />
                          <Action
                            title="Clear All Saved Games"
                            onAction={async () => {
                              setSavedGames([]);
                              await LocalStorage.setItem(
                                "saved_itad_games",
                                JSON.stringify([]),
                              );
                              cache.remove(CACHE_KEY);
                            }}
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{
                              Windows: {
                                modifiers: ["ctrl", "shift"],
                                key: "backspace",
                              },
                              macOS: {
                                modifiers: ["cmd", "shift"],
                                key: "backspace",
                              },
                            }}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface GameDetailProps {
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  gameType: string;
  removeGame?: () => void;
}

function GameDetail({
  gameId,
  gameTitle,
  gameSlug,
  gameType,
  removeGame,
}: GameDetailProps) {
  const [data, setData] = useState<DetailData>({
    steamData: null,
    realBundles: [],
    deals: [],
    historyLow: null,
    overview: null,
    historyChart: [],
    lastChecked: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [range, setRange] = useState<"3m" | "6m" | "1y">("1y");
  const SHOW_CHART = preferences.showPriceHistoryChart ?? true;
  const [selectedStores, setSelectedStores] = useState<string[]>(["all"]);

  useEffect(() => {
    LocalStorage.getItem<string>("selected_stores").then((s) =>
      setSelectedStores(s ? JSON.parse(s) : ["all"]),
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
    deals = [],
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

  const isDiscounted = currentBest && currentBest.cut > 0;
  let saleTagText = "";
  let saleTagColor = Color.Green;
  if (isDiscounted) {
    if (currentBest.cut >= 70) {
      saleTagText = "MEGA SALE";
      saleTagColor = Color.Green;
    } else if (currentBest.cut >= 40) {
      saleTagText = "ON SALE";
      saleTagColor = Color.Green;
    } else if (currentBest.cut >= 20) {
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

  const heroSection =
    currentBest && currentPrice != null
      ? `<h2 align="center">${signalText !== "INSUFFICIENT DATA" ? `${signalEmoji} ${signalText}` : ""}</h2>\n<h3 align="center">${formatPrice(currentPrice, currentBest.price?.currency)} ${isDiscounted ? `<code>-${currentBest.cut}%</code>` : ""} · ${currentBest.shop?.name}</h3>\n\n---\n\n`
      : "";

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
${filteredDeals?.length ? filteredDeals.map((p) => `| ${p.url ? `[${p.shop?.name}](${p.url})` : p.shop?.name} | **${formatPrice(p.price?.amount, p.price?.currency)}** | ${formatPrice(p.regular?.amount, p.price?.currency)} | ${p.cut && p.cut > 0 ? "-" + p.cut + "%" : "-"} |`).join("\n") : "| No data found | - | - | - |"}

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
          {signalText && (
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
          {(isDiscounted || bundle.activeCount > 0) && (
            <>
              <Detail.Metadata.Separator />
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
