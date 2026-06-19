import { List, ActionPanel } from "@raycast/api";
import { useMemo } from "react";
import StockListItem from "./stock-list-item";
import { FavoritesStore } from "./favorites-store";
import { FavoritesAddRemoveAction } from "./favorites-list";
import { Quote } from "./yahoo-finance";
import { formatTime } from "./utils";

export default function SearchList({
  searchResults,
  favoriteSymbols,
  favoritesStore,
  lastUpdated,
}: {
  searchResults: Quote[];
  favoriteSymbols: string[];
  favoritesStore: FavoritesStore;
  lastUpdated: Date | null;
}) {
  const favoriteSet = useMemo(() => new Set(favoriteSymbols), [favoriteSymbols]);

  return (
    <List.Section title="Search Results" subtitle={lastUpdated ? `Updated ${formatTime(lastUpdated)}` : undefined}>
      {searchResults.map((quote, i) => (
        <StockListItem
          key={quote.symbol + i.toString()}
          quote={quote}
          isFavorite={!!quote.symbol && favoriteSet.has(quote.symbol)}
          actions={
            <ActionPanel.Section>
              <FavoritesAddRemoveAction
                favorites={favoriteSymbols}
                favoritesStore={favoritesStore}
                symbol={quote.symbol!}
              />
            </ActionPanel.Section>
          }
        />
      ))}
    </List.Section>
  );
}
