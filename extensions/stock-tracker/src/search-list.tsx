import { List, ActionPanel } from "@raycast/api";
import { useMemo } from "react";
import StockListItem from "./stock-list-item";
import { FavoritesStore } from "./favorites-store";
import { FavoritesAddRemoveAction } from "./favorites-list";
import { MenuBarStore } from "./menubar-store";
import { MenuBarAddRemoveAction } from "./menubar-actions";
import { Quote } from "./yahoo-finance";
import { formatTime } from "./utils";

export default function SearchList({
  searchResults,
  favoriteSymbols,
  favoritesStore,
  menuBarSymbols,
  menuBarStore,
  lastUpdated,
}: {
  searchResults: Quote[];
  favoriteSymbols: string[];
  favoritesStore: FavoritesStore;
  menuBarSymbols: string[];
  menuBarStore: MenuBarStore;
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
          isInMenuBar={!!quote.symbol && menuBarSymbols.includes(quote.symbol)}
          actions={
            <ActionPanel.Section>
              <FavoritesAddRemoveAction
                favorites={favoriteSymbols}
                favoritesStore={favoritesStore}
                symbol={quote.symbol!}
              />
              <MenuBarAddRemoveAction
                menuBarSymbols={menuBarSymbols}
                menuBarStore={menuBarStore}
                symbol={quote.symbol!}
              />
            </ActionPanel.Section>
          }
        />
      ))}
    </List.Section>
  );
}
