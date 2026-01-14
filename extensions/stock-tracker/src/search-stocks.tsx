import { List, getPreferenceValues, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { useI18n } from "./locales";
import { getAllWatchlists } from "./services/watchlist";
import { StockItem, WatchlistItem, ColumnPreferences, WatchlistArray } from "./types";
import { StockListItem } from "./components/StockListItem";
import { parseColumnOrder } from "./utils/column-helpers";
import { searchStocks } from "./api/tradingview";
import { API_CONSTANTS } from "./constants";

export default function SearchStocksCommand() {
  const [watchlists, setWatchlists] = useState<WatchlistArray>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useI18n();

  const preferences = getPreferenceValues<ColumnPreferences>();
  const columnOrder = parseColumnOrder(preferences);

  useEffect(() => {
    loadWatchlists();
  }, []);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= API_CONSTANTS.MIN_QUERY_LENGTH) {
      handleSearch(trimmedQuery);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  async function loadWatchlists() {
    try {
      const allWatchlists = await getAllWatchlists();
      setWatchlists(allWatchlists);
    } catch {
      // Silent fail for watchlists
    }
  }

  const pinnedWatchlist = watchlists.find((w) => w.pinned);
  const pinnedStocks: WatchlistItem[] = pinnedWatchlist?.stocks ?? [];

  async function handleSearch(query: string) {
    setIsSearching(true);
    try {
      const results = await searchStocks(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleWatchlistUpdate() {
    await loadWatchlists();
  }

  return (
    <List
      isLoading={isSearching}
      searchBarPlaceholder={t.searchStocks.searchPlaceholder}
      onSearchTextChange={setSearchQuery}
      filtering={false}
    >
      {searchQuery.trim().length < API_CONSTANTS.MIN_QUERY_LENGTH ? (
        pinnedStocks.length > 0 ? (
          <>
            <List.Section title={pinnedWatchlist ? `📌 ${pinnedWatchlist.name}` : "Watchlist"}>
              {pinnedStocks.map((stock) => (
                <StockListItem
                  key={stock.symbol}
                  stock={stock}
                  columnOrder={columnOrder}
                  t={t}
                  watchlists={watchlists}
                  onWatchlistUpdate={handleWatchlistUpdate}
                />
              ))}
            </List.Section>
          </>
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={t.searchStocks.emptyTitle}
            description={t.searchStocks.emptyDescription}
          />
        )
      ) : searchResults.length === 0 && !isSearching ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t.searchStocks.noResultsTitle}
          description={t.searchStocks.noResultsDescription(searchQuery)}
        />
      ) : (
        searchResults.map((stock) => (
          <StockListItem
            key={stock.symbol}
            stock={stock}
            columnOrder={columnOrder}
            t={t}
            watchlists={watchlists}
            onWatchlistUpdate={handleWatchlistUpdate}
          />
        ))
      )}
    </List>
  );
}
