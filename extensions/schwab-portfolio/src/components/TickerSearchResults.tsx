import { List, Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import type { InstrumentResult } from "../types/quotes";
import { useWatchlist } from "../hooks/useWatchlist";
import { SymbolDetail } from "./SymbolDetail";

interface TickerSearchResultsProps {
  results: InstrumentResult[];
  isLoading: boolean;
  searchText: string;
  onSearchChange: (text: string) => void;
}

export function TickerSearchResults({ results, isLoading, searchText, onSearchChange }: TickerSearchResultsProps) {
  const { addSymbol } = useWatchlist();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by symbol or company name..."
      onSearchTextChange={onSearchChange}
      throttle
    >
      {results.map((instrument) => (
        <List.Item
          key={instrument.cusip || instrument.symbol}
          title={instrument.symbol}
          subtitle={instrument.description}
          accessories={[{ text: instrument.exchange }, { tag: instrument.assetType }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<SymbolDetail symbol={instrument.symbol} />} />
              <Action
                title="Add to Watchlist"
                icon={Icon.Star}
                shortcut={Keyboard.Shortcut.Common.Save}
                onAction={async () => {
                  await addSymbol(instrument.symbol);
                  await showToast({ style: Toast.Style.Success, title: `${instrument.symbol} added to Watchlist` });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Ticker"
                content={instrument.symbol}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
      {results.length === 0 && searchText.length > 0 && !isLoading && (
        <List.EmptyView
          title="No Results"
          description={`No instruments found for "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}
      {searchText.length === 0 && (
        <List.EmptyView
          title="Search Tickers"
          description="Type a symbol or company name to search"
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
