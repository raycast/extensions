import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync } from "fs";
import { INTERVALS, type Interval } from "./types";
import { useFavorites } from "./favorites-store";
import { useStockSearch } from "./use-stock-search";
import { useStockInfo } from "./use-stock-info";
import { useChartData } from "./use-chart-data";
import { useNews } from "./use-news";
import { useIntervalChanges } from "./use-interval-changes";
import { formatMoney, formatTime, generateIcs } from "./utils";
import StockListItem from "./stock-list-item";
import { StockDetail } from "./stock-detail";
import type { Quote } from "./yahoo-finance";

const SUGGESTED_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "BRK-B",
  "JPM",
  "V",
  "UNH",
  "MA",
  "HD",
  "COST",
  "NFLX",
  "CRM",
  "AMD",
  "ADBE",
  "KO",
  "DIS",
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [interval, setInterval] = useState<Interval>("1D");
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>();
  const isSearching = searchText.length > 0;

  const { favorites, favoritesStore, isLoading: favsLoading } = useFavorites();

  const allSymbols = useMemo(() => {
    const set = new Set([...favorites, ...SUGGESTED_SYMBOLS]);
    return [...set];
  }, [favorites]);

  const {
    searchResults,
    isLoading: searchLoading,
    lastUpdated: searchUpdated,
  } = useStockSearch(isSearching ? searchText : "");
  const {
    quotes: stockQuotes,
    isLoading: quotesLoading,
    lastUpdated: quotesUpdated,
  } = useStockInfo(isSearching ? [] : allSymbols);

  const favoriteQuotes = useMemo(
    () => favorites.map((s) => stockQuotes[s]).filter((q): q is Quote => !!q),
    [favorites, stockQuotes],
  );

  const popularQuotes = useMemo(
    () =>
      SUGGESTED_SYMBOLS.filter((s) => !favorites.includes(s))
        .map((s) => stockQuotes[s])
        .filter((q): q is Quote => !!q),
    [favorites, stockQuotes],
  );

  const { chartMarkdown, isLoading: chartLoading } = useChartData(
    selectedSymbol,
    interval,
  );
  const { news } = useNews(selectedSymbol);
  const { changes: intervalChanges } = useIntervalChanges(
    isSearching ? [] : allSymbols,
    interval,
  );

  const isLoading = isSearching ? searchLoading : favsLoading || quotesLoading;
  const lastUpdated = isSearching ? searchUpdated : quotesUpdated;

  const selectedQuote = isSearching
    ? searchResults.find((q) => q.symbol === selectedSymbol)
    : selectedSymbol
      ? stockQuotes[selectedSymbol]
      : undefined;

  function renderDetail(quote: Quote) {
    const isSelected = selectedSymbol === quote.symbol;
    return (
      <StockDetail
        quote={isSelected ? selectedQuote : undefined}
        chartMarkdown={isSelected ? chartMarkdown : ""}
        isLoading={isSelected && chartLoading}
        news={isSelected ? news : undefined}
      />
    );
  }

  async function addEarningsToCalendar(quote: Quote) {
    const ts =
      quote.earningsTimestamp ??
      quote.earningsTimestampStart ??
      quote.earningsTimestampEnd;
    if (!ts) return;
    const name = quote.displayName || quote.shortName || quote.symbol;
    const icsContent = generateIcs(quote.symbol, name, ts);
    const filePath = join(tmpdir(), `${quote.symbol}-earnings.ics`);
    try {
      writeFileSync(filePath, icsContent);
      await open(filePath);
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Calendar Error",
        message:
          e instanceof Error ? e.message : "Could not add earnings to calendar",
      });
    }
  }

  function renderSearchActions(quote: Quote) {
    const isFav = favorites.includes(quote.symbol);
    const hasEarnings = !!(
      quote.earningsTimestamp ??
      quote.earningsTimestampStart ??
      quote.earningsTimestampEnd
    );
    return (
      <ActionPanel>
        <Action.OpenInBrowser
          title="Open in Yahoo Finance"
          url={`https://finance.yahoo.com/quote/${quote.symbol}`}
          icon={Icon.Globe}
        />
        <Action.CopyToClipboard
          title="Copy Price"
          content={formatMoney(quote.regularMarketPrice, quote.currency)}
          icon={Icon.Clipboard}
        />
        {hasEarnings && (
          <Action
            title="Add Earnings to Calendar"
            icon={Icon.Calendar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() => addEarningsToCalendar(quote)}
          />
        )}
        {!isFav ? (
          <Action
            title="Add to Favorites"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => favoritesStore.add(quote.symbol)}
          />
        ) : (
          <Action
            title="Remove from Favorites"
            icon={Icon.StarDisabled}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => favoritesStore.remove(quote.symbol)}
          />
        )}
      </ActionPanel>
    );
  }

  function renderFavoriteActions(quote: Quote) {
    const hasEarnings = !!(
      quote.earningsTimestamp ??
      quote.earningsTimestampStart ??
      quote.earningsTimestampEnd
    );
    return (
      <ActionPanel>
        <Action.OpenInBrowser
          title="Open in Yahoo Finance"
          url={`https://finance.yahoo.com/quote/${quote.symbol}`}
          icon={Icon.Globe}
        />
        <Action.CopyToClipboard
          title="Copy Price"
          content={formatMoney(quote.regularMarketPrice, quote.currency)}
          icon={Icon.Clipboard}
        />
        {hasEarnings && (
          <Action
            title="Add Earnings to Calendar"
            icon={Icon.Calendar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() => addEarningsToCalendar(quote)}
          />
        )}
        <Action
          title="Remove from Favorites"
          icon={Icon.StarDisabled}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => favoritesStore.remove(quote.symbol)}
        />
        <Action
          title="Move up"
          icon={Icon.ArrowUp}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          onAction={() => favoritesStore.moveUp(quote.symbol)}
        />
        <Action
          title="Move Down"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          onAction={() => favoritesStore.moveDown(quote.symbol)}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search stocks by name or symbol..."
      onSearchTextChange={setSearchText}
      throttle
      onSelectionChange={(id) => setSelectedSymbol(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Interval"
          storeValue
          onChange={(v) => setInterval(v as Interval)}
        >
          {INTERVALS.map((iv) => (
            <List.Dropdown.Item key={iv} title={iv} value={iv} />
          ))}
        </List.Dropdown>
      }
    >
      {isSearching ? (
        <List.Section
          title="Results"
          subtitle={
            lastUpdated ? `Updated ${formatTime(lastUpdated)}` : undefined
          }
        >
          {searchResults.map((quote) => (
            <StockListItem
              key={quote.symbol}
              quote={quote}
              isFavorite={favorites.includes(quote.symbol)}
              detail={renderDetail(quote)}
              actions={renderSearchActions(quote)}
            />
          ))}
        </List.Section>
      ) : (
        <>
          {favoriteQuotes.length > 0 && (
            <List.Section
              title="Favorites"
              subtitle={
                lastUpdated ? `Updated ${formatTime(lastUpdated)}` : undefined
              }
            >
              {favoriteQuotes.map((quote) => (
                <StockListItem
                  key={quote.symbol}
                  quote={quote}
                  isFavorite
                  intervalChangePercent={
                    intervalChanges[quote.symbol]?.changePercent
                  }
                  detail={renderDetail(quote)}
                  actions={renderFavoriteActions(quote)}
                />
              ))}
            </List.Section>
          )}
          <List.Section
            title="Popular"
            subtitle={
              favoriteQuotes.length === 0 ? "Add favorites with ⌘D" : undefined
            }
          >
            {popularQuotes.map((quote) => (
              <StockListItem
                key={quote.symbol}
                quote={quote}
                intervalChangePercent={
                  intervalChanges[quote.symbol]?.changePercent
                }
                detail={renderDetail(quote)}
                actions={renderSearchActions(quote)}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
