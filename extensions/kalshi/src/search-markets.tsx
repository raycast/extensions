import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  getLocalStorageItem,
  setLocalStorageItem,
} from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { URLSearchParams } from "node:url";

const SERIES_FAVORITES_STORAGE_KEY = "kalshi-series-favorites";
const MARKET_FAVORITES_STORAGE_KEY = "kalshi-market-favorites";

interface Market {
  ticker: string;
  yes_subtitle: string;
  no_subtitle: string;
  yes_bid: number;
  yes_ask: number;
  last_price: number;
  yes_bid_dollars: string;
  yes_ask_dollars: string;
  last_price_dollars: string;
  price_delta: number;
  close_ts: string;
  expected_expiration_ts: string;
  open_ts: string;
  rulebook_variables: Record<string, unknown>;
  result: string;
  custom_strike: Record<string, unknown>;
  score: number;
  market_id: string;
  title: string;
  potential_payout_from_100_dollars: {
    yes: string;
    no: string;
  };
}

interface Series {
  series_ticker: string;
  series_title: string;
  event_ticker: string;
  event_subtitle: string;
  event_title: string;
  category: string;
  product_metadata: {
    categories: string[];
    competition?: string;
    [key: string]: unknown;
  };
  product_metadata_derived: {
    competition?: string;
    live_title?: string;
    [key: string]: unknown;
  };
  total_series_volume: number;
  total_volume: number;
  total_market_count: number;
  active_market_count: number;
  markets: Market[];
  is_trending: boolean;
  is_new: boolean;
  is_closing: boolean;
  is_price_delta: boolean;
  search_score: number;
  fee_type: string;
  fee_multiplier: number;
}

interface KalshiSearchResponse {
  total_results_count: number;
  current_page: Series[];
  next_cursor?: string;
}

interface FavoritesState {
  series: Map<string, Series>;
  markets: Set<string>;
}

function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritesState>({ series: new Map(), markets: new Set() });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const [seriesStored, marketsStored] = await Promise.all([
          getLocalStorageItem<string>(SERIES_FAVORITES_STORAGE_KEY),
          getLocalStorageItem<string>(MARKET_FAVORITES_STORAGE_KEY),
        ]);

        const seriesFavorites = new Map<string, Series>();
        if (seriesStored) {
          const storedArray = JSON.parse(seriesStored) as Series[];
          storedArray.forEach((series) => {
            seriesFavorites.set(series.event_ticker, series);
          });
        }

        const marketFavorites = marketsStored ? new Set(JSON.parse(marketsStored) as string[]) : new Set<string>();

        setFavorites({ series: seriesFavorites, markets: marketFavorites });
      } catch (error) {
        console.error("Failed to load favorites:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFavorites();
  }, []);

  const saveSeriesFavorites = useCallback(async (newFavorites: Map<string, Series>) => {
    try {
      const favoritesArray = Array.from(newFavorites.values());
      await setLocalStorageItem(SERIES_FAVORITES_STORAGE_KEY, JSON.stringify(favoritesArray));
      setFavorites((prev) => ({ ...prev, series: newFavorites }));
    } catch (error) {
      console.error("Failed to save series favorites:", error);
      throw error;
    }
  }, []);

  const saveMarketFavorites = useCallback(async (newFavorites: Set<string>) => {
    try {
      const favoritesArray = Array.from(newFavorites);
      await setLocalStorageItem(MARKET_FAVORITES_STORAGE_KEY, JSON.stringify(favoritesArray));
      setFavorites((prev) => ({ ...prev, markets: newFavorites }));
    } catch (error) {
      console.error("Failed to save market favorites:", error);
      throw error;
    }
  }, []);

  const addSeriesFavorite = useCallback(
    async (series: Series) => {
      const newFavorites = new Map(favorites.series);
      newFavorites.set(series.event_ticker, series);
      await saveSeriesFavorites(newFavorites);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to favorites",
      });
    },
    [favorites.series, saveSeriesFavorites],
  );

  const removeSeriesFavorite = useCallback(
    async (eventTicker: string) => {
      const newFavorites = new Map(favorites.series);
      newFavorites.delete(eventTicker);
      await saveSeriesFavorites(newFavorites);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from favorites",
      });
    },
    [favorites.series, saveSeriesFavorites],
  );

  const addMarketFavorite = useCallback(
    async (marketTicker: string) => {
      const newFavorites = new Set(favorites.markets);
      newFavorites.add(marketTicker);
      await saveMarketFavorites(newFavorites);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to favorites",
      });
    },
    [favorites.markets, saveMarketFavorites],
  );

  const removeMarketFavorite = useCallback(
    async (marketTicker: string) => {
      const newFavorites = new Set(favorites.markets);
      newFavorites.delete(marketTicker);
      await saveMarketFavorites(newFavorites);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from favorites",
      });
    },
    [favorites.markets, saveMarketFavorites],
  );

  const isSeriesFavorite = useCallback(
    (eventTicker: string) => {
      return favorites.series.has(eventTicker);
    },
    [favorites.series],
  );

  const getSeriesFavorites = useCallback(() => {
    return Array.from(favorites.series.values());
  }, [favorites.series]);

  const isMarketFavorite = useCallback(
    (marketTicker: string) => {
      return favorites.markets.has(marketTicker);
    },
    [favorites.markets],
  );

  return {
    isLoading,
    addSeriesFavorite,
    removeSeriesFavorite,
    isSeriesFavorite,
    getSeriesFavorites,
    addMarketFavorite,
    removeMarketFavorite,
    isMarketFavorite,
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading: favoritesLoading,
    addSeriesFavorite,
    removeSeriesFavorite,
    isSeriesFavorite,
    getSeriesFavorites,
  } = useFavorites();

  const apiUrl =
    searchText.length === 0
      ? "https://api.elections.kalshi.com/v1/search/series?order_by=event-volume&status=open%2Cunopened&page_size=50&with_milestones=true"
      : `https://api.elections.kalshi.com/v1/search/series?${new URLSearchParams({
          query: searchText,
          order_by: "querymatch",
          page_size: "25",
          fuzzy_threshold: "4",
          with_milestones: "true",
        }).toString()}`;

  const { data, isLoading, error } = useFetch<KalshiSearchResponse>(apiUrl, {
    parseResponse: parseFetchResponse,
    onError: async (error) => {
      await showFailureToast({
        title: "Failed to fetch markets",
        message: error.message,
      });
    },
  });

  const isDefaultView = searchText.length === 0;
  const favoriteSeries: Series[] = [];
  const regularSeries: Series[] = [];
  const storedFavorites = getSeriesFavorites();

  if (isDefaultView) {
    const addedTickers = new Set<string>();

    storedFavorites.forEach((storedSeries) => {
      if (!storedSeries.event_ticker || !storedSeries.series_ticker) {
        return;
      }
      if (addedTickers.has(storedSeries.event_ticker)) {
        return;
      }
      const apiSeries = data?.current_page.find((s) => s.event_ticker === storedSeries.event_ticker);
      const seriesToAdd = apiSeries || storedSeries;
      favoriteSeries.push(seriesToAdd);
      addedTickers.add(seriesToAdd.event_ticker);
    });

    if (data) {
      data.current_page.forEach((series) => {
        if (!isSeriesFavorite(series.event_ticker)) {
          regularSeries.push(series);
        }
      });
    }
  } else {
    if (data) {
      data.current_page.forEach((series) => {
        if (isSeriesFavorite(series.event_ticker)) {
          favoriteSeries.push(series);
        } else {
          regularSeries.push(series);
        }
      });
    }
  }

  return (
    <List
      isLoading={isLoading || favoritesLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Kalshi markets..."
      throttle
    >
      {error ? (
        <List.EmptyView title="Error" description="Failed to load markets. Please try again." />
      ) : data && data.current_page.length === 0 ? (
        <List.EmptyView title="No Results" description="No markets found matching your search." />
      ) : (
        <>
          {isDefaultView && favoriteSeries.length > 0 && (
            <List.Section title="Favorites" subtitle={`${favoriteSeries.length} favorites`}>
              {favoriteSeries
                .filter((series) => series && series.event_ticker && series.series_ticker)
                .map((series) => (
                  <SeriesListItem
                    key={series.event_ticker}
                    series={series}
                    isFavorite={true}
                    onToggleFavorite={() => removeSeriesFavorite(series.event_ticker)}
                  />
                ))}
            </List.Section>
          )}
          <List.Section
            title={isDefaultView ? "Top Markets by 24h Volume" : "Markets"}
            subtitle={data ? `${isDefaultView ? regularSeries.length : data.total_results_count} results` : ""}
          >
            {(isDefaultView ? regularSeries : data?.current_page || []).map((series) => (
              <SeriesListItem
                key={series.event_ticker}
                series={series}
                isFavorite={isSeriesFavorite(series.event_ticker)}
                onToggleFavorite={() =>
                  isSeriesFavorite(series.event_ticker)
                    ? removeSeriesFavorite(series.event_ticker)
                    : addSeriesFavorite(series)
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

function getYesPrice(market: Market): number {
  if (market.last_price_dollars) {
    const price = parseFloat(market.last_price_dollars);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }
  if (market.yes_bid_dollars) {
    const price = parseFloat(market.yes_bid_dollars);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }
  if (market.yes_ask_dollars) {
    const price = parseFloat(market.yes_ask_dollars);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }
  if (market.last_price && market.last_price > 0) {
    return market.last_price / 100;
  }
  if (market.yes_bid && market.yes_bid > 0) {
    return market.yes_bid / 100;
  }
  if (market.yes_ask && market.yes_ask > 0) {
    return market.yes_ask / 100;
  }
  return 0;
}

function MarketList({ series }: { series: Series }) {
  const { isLoading: favoritesLoading, addMarketFavorite, removeMarketFavorite, isMarketFavorite } = useFavorites();

  const sortedMarkets = [...series.markets].sort((a, b) => {
    const priceA = getYesPrice(a);
    const priceB = getYesPrice(b);
    if (priceA === 0 && priceB === 0) return 0;
    if (priceA === 0) return 1;
    if (priceB === 0) return -1;
    return priceB - priceA;
  });

  const favoriteMarkets: Market[] = [];
  const regularMarkets: Market[] = [];

  sortedMarkets.forEach((market) => {
    if (isMarketFavorite(market.ticker)) {
      favoriteMarkets.push(market);
    } else {
      regularMarkets.push(market);
    }
  });

  return (
    <List isLoading={favoritesLoading}>
      {favoriteMarkets.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favoriteMarkets.length} favorites`}>
          {favoriteMarkets.map((market) => (
            <MarketListItem
              key={market.ticker}
              market={market}
              series={series}
              isFavorite={true}
              onToggleFavorite={() => removeMarketFavorite(market.ticker)}
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Markets" subtitle={`${regularMarkets.length} markets`}>
        {regularMarkets.map((market) => (
          <MarketListItem
            key={market.ticker}
            market={market}
            series={series}
            isFavorite={false}
            onToggleFavorite={() => addMarketFavorite(market.ticker)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function MarketListItem({
  market,
  series,
  isFavorite = false,
  onToggleFavorite,
}: {
  market: Market;
  series: Series;
  isFavorite?: boolean;
  onToggleFavorite: () => void;
}) {
  const yesPrice = getYesPrice(market);
  const yesPercentage = yesPrice > 0 ? `${(yesPrice * 100).toFixed(0)}%` : null;

  const seriesTickerLower = series.series_ticker.toLowerCase();
  const seriesTitleSlug = slugify(series.series_title);
  const eventTickerLower = series.event_ticker.toLowerCase();
  const marketUrl = `https://kalshi.com/markets/${seriesTickerLower}/${seriesTitleSlug}/${eventTickerLower}`;

  const accessories: Array<{ text: string }> = [];
  if (yesPercentage) {
    accessories.push({ text: yesPercentage });
  }

  return (
    <List.Item
      title={{
        value: market.yes_subtitle || market.ticker,
        tooltip: market.yes_subtitle || market.ticker,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={marketUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isFavorite ? "Remove/Unfavorite" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={onToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Market Ticker" content={market.ticker} />
            <Action.CopyToClipboard title="Copy URL" content={marketUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SeriesListItem({
  series,
  isFavorite = false,
  onToggleFavorite,
}: {
  series: Series;
  isFavorite?: boolean;
  onToggleFavorite: () => void;
}) {
  const seriesTickerLower = (series.series_ticker || "").toLowerCase();
  const seriesTitleSlug = slugify(series.series_title || "");
  const eventTickerLower = (series.event_ticker || "").toLowerCase();
  const kalshiUrl = `https://kalshi.com/markets/${seriesTickerLower}/${seriesTitleSlug}/${eventTickerLower}`;

  const accessories: Array<{ text: string }> = [];

  if (series.total_volume > 0) {
    accessories.push({ text: formatVolume(series.total_volume) });
  }

  return (
    <List.Item
      title={{
        value: series.event_title || series.series_title,
        tooltip: series.event_title || series.series_title,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="View Markets" target={<MarketList series={series} />} icon={Icon.AppWindowList} />
            <Action.OpenInBrowser title="Open in Browser" url={kalshiUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isFavorite ? "Remove/Unfavorite" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={onToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Market Ticker"
              content={series.event_ticker || series.series_ticker}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard title="Copy URL" content={kalshiUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response): Promise<KalshiSearchResponse> {
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const json = (await response.json()) as KalshiSearchResponse | { error?: string; message?: string };

  if ("error" in json || "message" in json) {
    throw new Error("error" in json ? json.error : json.message || "Unknown error");
  }

  return json as KalshiSearchResponse;
}
