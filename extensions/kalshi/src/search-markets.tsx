import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { Component } from "react";

import { FavoriteState, getFavorites, isFavorite, parsePreferenceList, toggleFavorite } from "./lib/favorites";
import {
  DEFAULT_FILTERS,
  KalshiSeries,
  categoryBuckets,
  categoryHeatmapMarkdown,
  fetchMarketDetail,
  fetchSeries,
  fetchSeriesChartMarkdown,
  formatCents,
  formatNumber,
  getMarketImageUrl,
  getMarketNoPrice,
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

type DetailViewMode = "simple" | "advanced";

class SearchMarketsCommand extends Component<Record<string, never>, CommandState> {
  private preferences = getPreferenceValues<Preferences.SearchMarkets>();
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
    const { favorites, error, isLoadingFavorites, isLoadingSeries, searchText, selectedFilter, series } = this.state;
    const preferenceTopics = parsePreferenceList(this.preferences.favoriteTopics);
    const detailView = (this.preferences.detailView ?? "simple") as DetailViewMode;
    const favoriteTopics = [...preferenceTopics, ...favorites.topics];
    const filters = orderFilters(favorites.filters, favoriteTopics);
    const filteredSeries =
      selectedFilter === "Favorites"
        ? rankSeries(
            series.filter(
              (item) =>
                isSeriesFavorite(item, favoriteTopics) ||
                marketsForSeries(item).some((market) => isFavorite(favorites.markets, market.ticker)),
            ),
          )
        : selectedFilter === "Stats"
          ? []
          : rankSeries(series);
    const visibleSeries = filteredSeries.filter((item) => !isSeriesPinned(item, favoriteTopics, favorites.markets));
    const pinnedSeries = filteredSeries.filter((item) => isSeriesPinned(item, favoriteTopics, favorites.markets));
    const statsMarkets = series.flatMap((item) => marketsForSeries(item));
    const totalResultCount = filteredSeries.length;

    return (
      <List
        isLoading={isLoadingSeries || isLoadingFavorites}
        searchBarPlaceholder="Search Kalshi events or markets..."
        searchText={searchText}
        onSearchTextChange={this.setSearchText}
        throttle
        searchBarAccessory={
          <List.Dropdown tooltip="Filter markets" value={selectedFilter} onChange={this.setSelectedFilter}>
            {filters.map((filter) => (
              <List.Dropdown.Item
                key={filter}
                title={filterTitle(filter)}
                value={filter}
                icon={isFavorite(favorites.filters, filter) ? Icon.Star : undefined}
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
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={this.refreshSeries} />
                <DetailViewPreferencesAction />
              </ActionPanel>
            }
          />
        ) : selectedFilter === "Stats" ? (
          <StatsItem markets={statsMarkets} />
        ) : filteredSeries.length === 0 ? (
          <List.EmptyView
            title="No markets found"
            description="Try another query or filter."
            icon={Icon.MagnifyingGlass}
          />
        ) : (
          <>
            {pinnedSeries.length > 0 ? (
              <List.Section title="Favorites" subtitle={`${pinnedSeries.length} pinned`}>
                {pinnedSeries.map((item) => (
                  <SeriesItem
                    key={item.event_ticker ?? item.series_ticker}
                    series={item}
                    favoriteTopics={favoriteTopics}
                    favorites={favorites}
                    detailView={detailView}
                    selectedFilter={selectedFilter}
                    onRefresh={this.refreshSeries}
                    onToggleFilter={this.toggleFilterFavorite}
                    onToggleMarket={this.toggleMarketFavorite}
                    onToggleTopic={this.toggleTopicFavorite}
                  />
                ))}
              </List.Section>
            ) : null}
            {visibleSeries.length > 0 ? (
              <List.Section
                title={marketSectionTitle(selectedFilter, searchText)}
                subtitle={`${totalResultCount} results`}
              >
                {visibleSeries.map((item) => (
                  <SeriesItem
                    key={item.event_ticker ?? item.series_ticker}
                    series={item}
                    favoriteTopics={favoriteTopics}
                    favorites={favorites}
                    detailView={detailView}
                    selectedFilter={selectedFilter}
                    onRefresh={this.refreshSeries}
                    onToggleFilter={this.toggleFilterFavorite}
                    onToggleMarket={this.toggleMarketFavorite}
                    onToggleTopic={this.toggleTopicFavorite}
                  />
                ))}
              </List.Section>
            ) : null}
          </>
        )}
      </List>
    );
  }
}

function StatsItem({ markets }: { markets: KalshiMarket[] }) {
  const buckets = categoryBuckets(markets);

  if (buckets.length === 0) {
    return null;
  }

  return (
    <List.Section title="Stats">
      <List.Item
        title="Category Heatmap"
        subtitle={buckets
          .slice(0, 3)
          .map((bucket) => `${bucket.category} ${formatNumber(bucket.volume)}`)
          .join(" · ")}
        icon={{
          source: Icon.BarChart,
          tintColor: Color.PrimaryText,
        }}
        accessories={[
          {
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
                  markdown={["# Category Heatmap", "", categoryHeatmapMarkdown(markets)].join("\n")}
                />
              }
            />
            <DetailViewPreferencesAction />
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
  detailView: DetailViewMode;
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
  detailView,
  selectedFilter,
  onRefresh,
  onToggleFilter,
  onToggleMarket,
  onToggleTopic,
}: SeriesItemProps) {
  const favorite = isSeriesFavorite(series, favoriteTopics);
  const markets = marketsForSeries(series);
  const category = series.category ?? markets[0]?.category;
  const favoriteKey = series.event_ticker ?? series.series_ticker ?? getSeriesTitle(series);
  const accessories: List.Item.Accessory[] = [];

  if (getSeriesVolume(series) > 0) {
    accessories.push({
      text: formatNumber(getSeriesVolume(series)),
      tooltip: "Volume",
    });
  }

  accessories.push({
    icon: {
      source: Icon.Star,
      tintColor: favorite ? Color.Yellow : Color.SecondaryText,
    },
    tooltip: favorite ? "Favorite Event" : "Favorite Event (Cmd+F)",
  });

  const imageUrl = getSeriesImageUrl(series);

  return (
    <List.Item
      title={getSeriesTitle(series)}
      subtitle={getSeriesSubtitle(series)}
      icon={
        imageUrl
          ? { source: imageUrl }
          : {
              source: categoryIcon(category),
              tintColor: Color.PrimaryText,
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
                detailView={detailView}
                onToggleMarket={onToggleMarket}
              />
            }
          />
          <Action.OpenInBrowser title="Open in Kalshi" url={getSeriesUrl(series)} />
          <Action
            title={favorite ? "Remove Favorite Event" : "Favorite Event"}
            icon={favorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={async () => {
              await onToggleTopic(favoriteKey);
              await showToast({
                style: Toast.Style.Success,
                title: favorite ? "Removed favorite event" : "Added favorite event",
              });
            }}
          />
          {!isReservedFilter(selectedFilter) ? (
            <Action
              title={isFavorite(favorites.filters, selectedFilter) ? "Remove Favorite Filter" : "Favorite Filter"}
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
          <Action.CopyToClipboard title="Copy Event Ticker" content={favoriteKey} />
          <DetailViewPreferencesAction />
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
  detailView: DetailViewMode;
  onToggleMarket: (market: KalshiMarket) => Promise<void>;
};

type MarketListState = {
  chartMarkdown: string;
  error?: string;
  isLoadingDetails: boolean;
  rulesMarket?: KalshiMarket;
};

class MarketList extends Component<MarketListProps, MarketListState> {
  private requestId = 0;

  state: MarketListState = {
    chartMarkdown: "",
    error: undefined,
    isLoadingDetails: true,
  };

  componentDidMount() {
    void this.loadDetails();
  }

  componentDidUpdate(previousProps: MarketListProps) {
    if (previousProps.series !== this.props.series || previousProps.detailView !== this.props.detailView) {
      void this.loadDetails();
    }
  }

  loadDetails = async () => {
    const requestId = ++this.requestId;
    const { series } = this.props;
    const markets = marketsForSeries(series);
    this.setState({
      chartMarkdown: "",
      error: undefined,
      isLoadingDetails: true,
      rulesMarket: undefined,
    });

    try {
      const [rulesMarket, chartMarkdown] = await Promise.all([
        fetchFirstMarketDetail(markets[0]).catch(() => undefined),
        this.props.detailView === "advanced" ? fetchSeriesChartMarkdown(series).catch(() => "") : Promise.resolve(""),
      ]);

      if (requestId === this.requestId) {
        this.setState({
          chartMarkdown,
          isLoadingDetails: false,
          rulesMarket,
        });
      }
    } catch (error) {
      if (requestId === this.requestId) {
        this.setState({
          error: errorMessage(error, "Could not load market details."),
          isLoadingDetails: false,
        });
      }
    }
  };

  render() {
    const { favorites, onToggleMarket, series } = this.props;
    const { chartMarkdown, error, isLoadingDetails, rulesMarket } = this.state;
    const markets = marketsForSeries(series);
    const detailMarkdown = buildSeriesMarkdown(series, markets, chartMarkdown, rulesMarket, error);

    return (
      <List navigationTitle={getSeriesTitle(series)} isLoading={isLoadingDetails} isShowingDetail>
        <List.Section>
          <List.Item
            title={getSeriesTitle(series)}
            subtitle={getSeriesSubtitle(series)}
            icon={seriesIcon(series)}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Kalshi" url={getSeriesUrl(series)} />
                <DetailViewPreferencesAction />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.Section title="Options" subtitle={`${markets.length} markets`}>
          <List.Item
            title="Option"
            accessories={optionHeaderAccessories()}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
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
                  <List.Item.Detail markdown={buildMarketMarkdown(series, market, chartMarkdown, rulesMarket, error)} />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Kalshi" url={getMarketUrl(market, series)} />
                    <Action
                      title={favorite ? "Remove Favorite" : "Favorite Option"}
                      icon={favorite ? Icon.StarDisabled : Icon.Star}
                      onAction={async () => {
                        await onToggleMarket(market);
                        await showToast({
                          style: Toast.Style.Success,
                          title: favorite ? "Removed favorite" : "Added favorite",
                        });
                      }}
                    />
                    <DetailViewPreferencesAction />
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
  markets: KalshiMarket[],
  chartMarkdown: string,
  rulesMarket?: KalshiMarket,
  error?: string,
): string {
  return [
    `# [${escapeMarkdown(getSeriesTitle(series))}](${getSeriesUrl(series)})`,
    getSeriesSubtitle(series) ? `_${getSeriesSubtitle(series)}_` : "",
    error ? `> ${error}` : "",
    chartMarkdown,
    seriesOverviewMarkdown(series, markets),
    marketRulesMarkdown(rulesMarket),
  ]
    .filter((line) => line !== "")
    .join("\n\n");
}

function buildMarketMarkdown(
  series: KalshiSeries,
  market: KalshiMarket,
  chartMarkdown: string,
  rulesMarket?: KalshiMarket,
  error?: string,
): string {
  return [
    `# [${escapeMarkdown(market.yes_sub_title ?? market.subtitle ?? market.ticker)}](${getMarketUrl(market, series)})`,
    `_${escapeMarkdown(getSeriesTitle(series))}_`,
    error ? `> ${error}` : "",
    chartMarkdown,
    marketOverviewMarkdown(market),
    market.ticker === rulesMarket?.ticker ? marketRulesMarkdown(rulesMarket) : "",
  ]
    .filter((line) => line !== "")
    .join("\n\n");
}

function seriesOverviewMarkdown(series: KalshiSeries, markets: KalshiMarket[]): string {
  return [
    "## Event",
    "",
    "| Field | Value |",
    "| --- | ---: |",
    `| Volume | ${formatNumber(getSeriesVolume(series))} |`,
    `| Markets | ${markets.length} |`,
    series.event_ticker ? `| Event Ticker | \`${series.event_ticker}\` |` : "",
    series.series_ticker ? `| Series Ticker | \`${series.series_ticker}\` |` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function marketOverviewMarkdown(market: KalshiMarket): string {
  return [
    "## Market",
    "",
    "| Field | Value |",
    "| --- | ---: |",
    `| Yes | ${formatCents(getMarketYesPrice(market))} |`,
    `| No | ${formatCents(getMarketNoPrice(market))} |`,
    `| Volume | ${formatNumber(getMarketVolume(market))} |`,
    market.status ? `| Status | ${market.status} |` : "",
    market.close_time ? `| Close | ${formatDate(market.close_time)} |` : "",
    market.expected_expiration_time ? `| Expected Expiration | ${formatDate(market.expected_expiration_time)} |` : "",
    `| Ticker | \`${market.ticker}\` |`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US");
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
    filter === "All" || filter === "Stats" || filter === "Favorites" || filter === "Inactive" || filter === "Resolved"
  );
}

function DetailViewPreferencesAction() {
  return (
    <Action
      title="Change Detail View"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      onAction={() => void openCommandPreferences()}
    />
  );
}

function isSeriesPinned(series: KalshiSeries, favoriteTopics: string[], favoriteMarkets: string[]): boolean {
  return (
    isSeriesFavorite(series, favoriteTopics) ||
    marketsForSeries(series).some((market) => isFavorite(favoriteMarkets, market.ticker))
  );
}

async function fetchFirstMarketDetail(market?: KalshiMarket) {
  if (!market) {
    return undefined;
  }

  return fetchMarketDetail(market);
}

function seriesIcon(series: KalshiSeries) {
  const imageUrl = getSeriesImageUrl(series);

  if (imageUrl) {
    return { source: imageUrl };
  }

  return {
    source: categoryIcon(series.category),
    tintColor: Color.PrimaryText,
  };
}

function optionHeaderAccessories(): List.Item.Accessory[] {
  return [
    { text: "Yes", tooltip: "Yes" },
    { text: "Vol", tooltip: "24h Volume" },
  ];
}

function marketOptionAccessories(market: KalshiMarket): List.Item.Accessory[] {
  const volume = formatNumber(market.volume_24h ?? market.volume_24h_fp ?? getMarketVolume(market));

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

function marketDetailIcon(market: KalshiMarket) {
  const imageUrl = getMarketImageUrl(market);

  if (imageUrl) {
    return { source: imageUrl };
  }

  return {
    source: Icon.LineChart,
    tintColor: Color.PrimaryText,
  };
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

function orderFilters(favoriteFilters: string[], favoriteTopics: string[]): string[] {
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
