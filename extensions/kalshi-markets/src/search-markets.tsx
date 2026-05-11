import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { Component } from "react";

import {
  FavoriteState,
  getFavorites,
  isFavorite,
  parsePreferenceList,
  toggleFavorite,
} from "./lib/favorites";
import {
  DEFAULT_FILTERS,
  KalshiSeries,
  categoryBuckets,
  categoryHeatmapMarkdown,
  fetchSeriesChartMarkdown,
  fetchMarketBundle,
  fetchSeries,
  formatCents,
  formatMarketPriceChange,
  formatNumber,
  getMarketImageUrl,
  getMarketUrl,
  getMarketYesPrice,
  getMarketVolume,
  getSeriesImageUrl,
  getSeriesSubtitle,
  getSeriesTitle,
  getSeriesUrl,
  getSeriesVolume,
  isSeriesFavorite,
  marketsForSeries,
  rankSeries,
} from "./lib/kalshi";
import type { KalshiMarket } from "./types/kalshi";

type Preferences = {
  favoriteTopics?: string;
};

export default function Command() {
  return <SearchMarketsCommand />;
}

type CommandState = {
  favorites: FavoriteState;
  error?: string;
  isLoadingFavorites: boolean;
  isLoadingSeries: boolean;
  searchText: string;
  selectedFilter: string;
  series: KalshiSeries[];
};

class SearchMarketsCommand extends Component<
  Record<string, never>,
  CommandState
> {
  private preferences = getPreferenceValues<Preferences>();
  private seriesRequestId = 0;

  state: CommandState = {
    favorites: { filters: [], markets: [], topics: [] },
    error: undefined,
    isLoadingFavorites: true,
    isLoadingSeries: true,
    searchText: "",
    selectedFilter: "All",
    series: [],
  };

  componentDidMount() {
    void this.refreshFavorites();
    void this.refreshSeries();
  }

  refreshFavorites = async () => {
    this.setState({ isLoadingFavorites: true });
    try {
      const favorites = await getFavorites();
      this.setState({ favorites, isLoadingFavorites: false });
    } catch (error) {
      this.setState({
        error: errorMessage(error, "Could not load favorites."),
        isLoadingFavorites: false,
      });
    }
  };

  refreshSeries = async () => {
    const requestId = ++this.seriesRequestId;
    const { searchText, selectedFilter } = this.state;
    this.setState({ error: undefined, isLoadingSeries: true });

    try {
      const series = await fetchSeries(searchText, selectedFilter);

      if (requestId === this.seriesRequestId) {
        this.setState({ series, isLoadingSeries: false });
      }
    } catch (error) {
      if (requestId === this.seriesRequestId) {
        this.setState({
          error: errorMessage(error, "Could not load Kalshi markets."),
          isLoadingSeries: false,
          series: [],
        });
      }
    }
  };

  setSearchText = (searchText: string) => {
    this.setState({ searchText }, () => {
      void this.refreshSeries();
    });
  };

  setSelectedFilter = (selectedFilter: string) => {
    this.setState({ selectedFilter }, () => {
      void this.refreshSeries();
    });
  };

  toggleMarketFavorite = async (market: KalshiMarket) => {
    await toggleFavorite("markets", market.ticker);
    await this.refreshFavorites();
  };

  toggleTopicFavorite = async (topic: string) => {
    await toggleFavorite("topics", topic);
    await this.refreshFavorites();
  };

  toggleFilterFavorite = async (filter: string) => {
    await toggleFavorite("filters", filter);
    await this.refreshFavorites();
  };

  render() {
    const {
      favorites,
      error,
      isLoadingFavorites,
      isLoadingSeries,
      searchText,
      selectedFilter,
      series,
    } = this.state;
    const preferenceTopics = parsePreferenceList(
      this.preferences.favoriteTopics,
    );
    const favoriteTopics = [...preferenceTopics, ...favorites.topics];
    const filters = orderFilters(favorites.filters, favoriteTopics);
    const visibleSeries =
      selectedFilter === "Favorites"
        ? rankSeries(
            series.filter((item) => isSeriesFavorite(item, favoriteTopics)),
          )
        : rankSeries(series);
    const visibleMarkets = visibleSeries.flatMap((item) =>
      marketsForSeries(item),
    );

    return (
      <List
        isLoading={isLoadingSeries || isLoadingFavorites}
        searchBarPlaceholder="Search Kalshi events or markets..."
        searchText={searchText}
        onSearchTextChange={this.setSearchText}
        throttle
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter markets"
            value={selectedFilter}
            onChange={this.setSelectedFilter}
          >
            {filters.map((filter) => (
              <List.Dropdown.Item
                key={filter}
                title={filterTitle(filter)}
                value={filter}
                icon={
                  isFavorite(favorites.filters, filter) ? Icon.Star : undefined
                }
              />
            ))}
          </List.Dropdown>
        }
      >
        {error ? (
          <List.EmptyView
            title="Could not load markets"
            description={error}
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  onAction={this.refreshSeries}
                />
              </ActionPanel>
            }
          />
        ) : visibleSeries.length === 0 ? (
          <List.EmptyView
            title="No markets found"
            description="Try another query or filter."
            icon={Icon.MagnifyingGlass}
          />
        ) : (
          <>
            <CategoryHeatmapItem markets={visibleMarkets} />
            <List.Section
              title={marketSectionTitle(selectedFilter, searchText)}
              subtitle={`${visibleSeries.length} results`}
            >
              {visibleSeries.map((item) => (
                <SeriesItem
                  key={item.event_ticker ?? item.series_ticker}
                  series={item}
                  favoriteTopics={favoriteTopics}
                  favorites={favorites}
                  selectedFilter={selectedFilter}
                  onRefresh={this.refreshSeries}
                  onToggleFilter={this.toggleFilterFavorite}
                  onToggleMarket={this.toggleMarketFavorite}
                  onToggleTopic={this.toggleTopicFavorite}
                />
              ))}
            </List.Section>
          </>
        )}
      </List>
    );
  }
}

function CategoryHeatmapItem({ markets }: { markets: KalshiMarket[] }) {
  const buckets = categoryBuckets(markets);
  const dominantBucket = buckets[0];

  if (buckets.length === 0) {
    return null;
  }

  return (
    <List.Section title="Volume Concentration">
      <List.Item
        title="Category Heatmap"
        subtitle={buckets
          .slice(0, 3)
          .map((bucket) => `${bucket.category} ${formatNumber(bucket.volume)}`)
          .join(" · ")}
        icon={{
          source: Icon.BarChart,
          tintColor: categoryColor(dominantBucket?.category),
        }}
        accessories={[
          {
            icon: {
              source: Icon.Circle,
              tintColor: categoryColor(dominantBucket?.category),
            },
            text: `${buckets.length} categories`,
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Heatmap"
              icon={Icon.BarChart}
              target={
                <Detail
                  navigationTitle="Category Heatmap"
                  markdown={[
                    "# Category Heatmap",
                    "",
                    categoryHeatmapMarkdown(markets),
                  ].join("\n")}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

type SeriesItemProps = {
  series: KalshiSeries;
  favoriteTopics: string[];
  favorites: FavoriteState;
  selectedFilter: string;
  onRefresh: () => void;
  onToggleFilter: (filter: string) => Promise<void>;
  onToggleMarket: (market: KalshiMarket) => Promise<void>;
  onToggleTopic: (topic: string) => Promise<void>;
};

function SeriesItem({
  series,
  favoriteTopics,
  favorites,
  selectedFilter,
  onRefresh,
  onToggleFilter,
  onToggleMarket,
  onToggleTopic,
}: SeriesItemProps) {
  const favorite = isSeriesFavorite(series, favoriteTopics);
  const markets = marketsForSeries(series);
  const category = series.category ?? markets[0]?.category;
  const favoriteKey =
    series.event_ticker ?? series.series_ticker ?? getSeriesTitle(series);
  const accessories: List.Item.Accessory[] = [];

  if (favorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite",
    });
  }

  if (getSeriesVolume(series) > 0) {
    accessories.push({
      text: formatNumber(getSeriesVolume(series)),
      tooltip: "Volume",
    });
  }

  const priceChange = firstPriceChange(markets);
  if (priceChange) {
    accessories.push({
      text: priceChange,
      tooltip: "24h Change",
    });
  }

  if (markets.length > 0) {
    accessories.push({
      text: `${markets.length} mkts`,
      tooltip: "Markets",
    });
  }

  const imageUrl = getSeriesImageUrl(series);

  return (
    <List.Item
      title={getSeriesTitle(series)}
      subtitle={getSeriesSubtitle(series)}
      icon={
        imageUrl
          ? { source: imageUrl }
          : favorite
            ? { source: Icon.Star, tintColor: Color.Yellow }
            : {
                source: categoryIcon(category),
                tintColor: categoryColor(category),
              }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Markets"
            icon={Icon.AppWindowList}
            target={
              <MarketList
                series={series}
                favorites={favorites}
                onToggleMarket={onToggleMarket}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open in Kalshi"
            url={getSeriesUrl(series)}
          />
          <Action
            title={favorite ? "Remove Favorite Event" : "Favorite Event"}
            icon={favorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={async () => {
              await onToggleTopic(favoriteKey);
              await showToast({
                style: Toast.Style.Success,
                title: favorite
                  ? "Removed favorite event"
                  : "Added favorite event",
              });
            }}
          />
          {!isReservedFilter(selectedFilter) ? (
            <Action
              title={
                isFavorite(favorites.filters, selectedFilter)
                  ? "Remove Favorite Filter"
                  : "Favorite Filter"
              }
              icon={Icon.Filter}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={async () => {
                await onToggleFilter(selectedFilter);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Updated favorite filter",
                });
              }}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Event Ticker"
            content={favoriteKey}
          />
          <Action
            title="Refresh Markets"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

type MarketListProps = {
  series: KalshiSeries;
  favorites: FavoriteState;
  onToggleMarket: (market: KalshiMarket) => Promise<void>;
};

type MarketListState = {
  chartMarkdown: string;
  error?: string;
  isLoadingChart: boolean;
  rulesMarket?: KalshiMarket;
};

class MarketList extends Component<MarketListProps, MarketListState> {
  private requestId = 0;

  state: MarketListState = {
    chartMarkdown: "_Loading market chart..._",
    error: undefined,
    isLoadingChart: true,
  };

  componentDidMount() {
    void this.loadDetails();
  }

  componentDidUpdate(previousProps: MarketListProps) {
    if (previousProps.series !== this.props.series) {
      void this.loadDetails();
    }
  }

  loadDetails = async () => {
    const requestId = ++this.requestId;
    const { series } = this.props;
    const markets = marketsForSeries(series);
    this.setState({
      chartMarkdown: "_Loading market chart..._",
      error: undefined,
      isLoadingChart: true,
      rulesMarket: undefined,
    });

    try {
      const [chartMarkdown, firstMarketBundle] = await Promise.all([
        fetchSeriesChartMarkdown(series),
        fetchFirstMarketBundle(markets[0]),
      ]);

      if (requestId === this.requestId) {
        this.setState({
          chartMarkdown,
          isLoadingChart: false,
          rulesMarket: firstMarketBundle?.market,
        });
      }
    } catch (error) {
      if (requestId === this.requestId) {
        this.setState({
          chartMarkdown: "",
          error: errorMessage(error, "Could not load market details."),
          isLoadingChart: false,
        });
      }
    }
  };

  render() {
    const { favorites, onToggleMarket, series } = this.props;
    const { chartMarkdown, error, isLoadingChart, rulesMarket } = this.state;
    const markets = marketsForSeries(series);

    return (
      <List
        navigationTitle={getSeriesTitle(series)}
        isLoading={isLoadingChart}
        isShowingDetail
      >
        <List.Section>
          <List.Item
            title={getSeriesTitle(series)}
            subtitle={getSeriesSubtitle(series)}
            icon={seriesIcon(series)}
            detail={
              <List.Item.Detail
                markdown={buildSeriesMarkdown(
                  series,
                  chartMarkdown,
                  rulesMarket,
                  error,
                )}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Kalshi"
                  url={getSeriesUrl(series)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.Section title="Options" subtitle={`${markets.length} markets`}>
          <List.Item
            title="Option"
            accessories={optionHeaderAccessories()}
            detail={
              <List.Item.Detail
                markdown={buildSeriesMarkdown(
                  series,
                  chartMarkdown,
                  rulesMarket,
                  error,
                )}
              />
            }
          />
          {markets.slice(0, 50).map((market) => {
            const favorite = isFavorite(favorites.markets, market.ticker);

            return (
              <List.Item
                key={market.ticker}
                title={market.yes_sub_title ?? market.subtitle ?? market.ticker}
                icon={marketDetailIcon(market)}
                accessories={marketOptionAccessories(market)}
                detail={
                  <List.Item.Detail
                    markdown={buildSeriesMarkdown(
                      series,
                      chartMarkdown,
                      rulesMarket,
                      error,
                    )}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Kalshi"
                      url={getMarketUrl(market)}
                    />
                    <Action
                      title={favorite ? "Remove Favorite" : "Favorite Option"}
                      icon={favorite ? Icon.StarDisabled : Icon.Star}
                      onAction={async () => {
                        await onToggleMarket(market);
                        await showToast({
                          style: Toast.Style.Success,
                          title: favorite
                            ? "Removed favorite"
                            : "Added favorite",
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      </List>
    );
  }
}

function buildSeriesMarkdown(
  series: KalshiSeries,
  chartMarkdown: string,
  rulesMarket?: KalshiMarket,
  error?: string,
): string {
  return [
    `# [${escapeMarkdown(getSeriesTitle(series))}](${getSeriesUrl(series)})`,
    getSeriesSubtitle(series) ? `_${getSeriesSubtitle(series)}_` : "",
    error ? `> ${error}` : "",
    chartMarkdown,
    marketRulesMarkdown(rulesMarket),
  ]
    .filter((line) => line !== "")
    .join("\n\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[[\]]/g, "\\$&");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function marketSectionTitle(filter: string, searchText: string): string {
  if (searchText) {
    return "Markets";
  }

  if (filter === "Inactive") {
    return "Inactive Markets by 24h Volume";
  }

  if (filter === "Resolved") {
    return "Resolved Markets by 24h Volume";
  }

  return "Active Markets by 24h Volume";
}

function filterTitle(filter: string): string {
  return filter === "All" ? "Active" : filter;
}

function isReservedFilter(filter: string): boolean {
  return (
    filter === "All" ||
    filter === "Favorites" ||
    filter === "Inactive" ||
    filter === "Resolved"
  );
}

async function fetchFirstMarketBundle(market?: KalshiMarket) {
  if (!market) {
    return undefined;
  }

  return fetchMarketBundle(market);
}

function seriesIcon(series: KalshiSeries) {
  const imageUrl = getSeriesImageUrl(series);

  if (imageUrl) {
    return { source: imageUrl };
  }

  return {
    source: categoryIcon(series.category),
    tintColor: categoryColor(series.category),
  };
}

function optionHeaderAccessories(): List.Item.Accessory[] {
  return [
    { text: "Yes", tooltip: "Yes" },
    { text: "Vol", tooltip: "24h Volume" },
  ];
}

function marketOptionAccessories(market: KalshiMarket): List.Item.Accessory[] {
  const volume = formatNumber(
    market.volume_24h ?? market.volume_24h_fp ?? getMarketVolume(market),
  );

  return [
    { text: formatCents(getMarketYesPrice(market)), tooltip: "Yes" },
    { text: volume, tooltip: "24h Volume" },
  ];
}

function marketRulesMarkdown(market?: KalshiMarket): string {
  if (!market?.rules_primary && !market?.rules_secondary) {
    return "";
  }

  return ["## Rules", market.rules_primary ?? "", market.rules_secondary ?? ""]
    .filter((line) => line !== "")
    .join("\n\n");
}

function firstPriceChange(markets: KalshiMarket[]): string {
  for (const market of markets) {
    const change = formatMarketPriceChange(market);

    if (change) {
      return change;
    }
  }

  return "";
}

function marketDetailIcon(market: KalshiMarket) {
  const imageUrl = getMarketImageUrl(market);

  if (imageUrl) {
    return { source: imageUrl };
  }

  return {
    source: Icon.LineChart,
    tintColor: marketChangeColor(formatMarketPriceChange(market)),
  };
}

function marketChangeColor(change: string): Color {
  if (change.startsWith("+")) {
    return Color.Green;
  }

  if (change.startsWith("-")) {
    return Color.Red;
  }

  return Color.SecondaryText;
}

function categoryIcon(category?: string): Icon {
  const normalized = (category ?? "").toLowerCase();

  if (/sport|nba|nfl|mlb|nhl|soccer|tennis/.test(normalized)) {
    return Icon.Trophy;
  }

  if (/politic|election|government/.test(normalized)) {
    return Icon.Person;
  }

  if (/crypto|bitcoin|ethereum/.test(normalized)) {
    return Icon.Coins;
  }

  if (/finance|financial|stock|fed|rate|inflation/.test(normalized)) {
    return Icon.BankNote;
  }

  if (/climate|weather|temperature|hurricane/.test(normalized)) {
    return Icon.CloudSun;
  }

  if (/entertainment|movie|music|tv|award/.test(normalized)) {
    return Icon.Video;
  }

  return Icon.AppWindowList;
}

function categoryColor(category?: string): Color {
  const normalized = (category ?? "").toLowerCase();

  if (/sport|nba|nfl|mlb|nhl|soccer|tennis/.test(normalized)) {
    return Color.Orange;
  }

  if (/politic|election|government/.test(normalized)) {
    return Color.Purple;
  }

  if (/crypto|bitcoin|ethereum/.test(normalized)) {
    return Color.Yellow;
  }

  if (/finance|financial|stock|fed|rate|inflation/.test(normalized)) {
    return Color.Blue;
  }

  if (/climate|weather|temperature|hurricane/.test(normalized)) {
    return Color.Blue;
  }

  if (/entertainment|movie|music|tv|award/.test(normalized)) {
    return Color.Magenta;
  }

  return Color.SecondaryText;
}

function orderFilters(
  favoriteFilters: string[],
  favoriteTopics: string[],
): string[] {
  const ordered = [...favoriteFilters, ...favoriteTopics, ...DEFAULT_FILTERS];
  const seen = new Set<string>();

  return ordered.filter((filter) => {
    const key = filter.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
