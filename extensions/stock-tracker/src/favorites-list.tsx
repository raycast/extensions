import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { Quote } from "./yahoo-finance";
import { FavoritesStore } from "./favorites-store";
import { MenuBarStore } from "./menubar-store";
import { MenuBarAddRemoveAction } from "./menubar-actions";
import StockListItem from "./stock-list-item";
import { formatTime } from "./utils";

export default function FavoritesList({
  favorites,
  favoriteSymbols,
  favoritesStore,
  menuBarSymbols,
  menuBarStore,
  lastUpdated,
}: {
  favorites: Quote[];
  favoriteSymbols: string[];
  favoritesStore: FavoritesStore;
  menuBarSymbols: string[];
  menuBarStore: MenuBarStore;
  lastUpdated: Date | null;
}) {
  return (
    <List.Section title="Favorites" subtitle={lastUpdated ? `Updated ${formatTime(lastUpdated)}` : undefined}>
      {favorites.map((quote) => (
        <StockListItem
          key={quote.symbol}
          quote={quote}
          isInMenuBar={!!quote.symbol && menuBarSymbols.includes(quote.symbol)}
          actions={
            <FavouritesActions
              favorites={favoriteSymbols}
              quote={quote}
              favoritesStore={favoritesStore}
              menuBarSymbols={menuBarSymbols}
              menuBarStore={menuBarStore}
            />
          }
        />
      ))}
    </List.Section>
  );
}

interface FavouritesActionsProps {
  favorites: string[];
  quote: Quote;
  favoritesStore: FavoritesStore;
  menuBarSymbols: string[];
  menuBarStore: MenuBarStore;
}

function FavouritesActions({ favorites, quote, favoritesStore, menuBarSymbols, menuBarStore }: FavouritesActionsProps) {
  return (
    <ActionPanel.Section>
      <Action
        title="Move Up in Favorites"
        icon={Icon.ArrowUp}
        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
        onAction={() => favoritesStore.moveUp(quote.symbol!)}
      />
      <Action
        title="Move Down in Favorites"
        icon={Icon.ArrowDown}
        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
        onAction={() => favoritesStore.moveDown(quote.symbol!)}
      />
      <FavoritesAddRemoveAction favorites={favorites} favoritesStore={favoritesStore} symbol={quote.symbol!} />
      <MenuBarAddRemoveAction menuBarSymbols={menuBarSymbols} menuBarStore={menuBarStore} symbol={quote.symbol!} />
    </ActionPanel.Section>
  );
}

export function FavoritesAddRemoveAction({
  favorites,
  favoritesStore,
  symbol,
}: {
  favorites: string[];
  favoritesStore: FavoritesStore;
  symbol: string;
}) {
  if (!favorites.includes(symbol)) {
    return (
      <Action
        title="Add to Favorites"
        icon={Icon.Star}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => favoritesStore.add(symbol)}
      />
    );
  }
  return (
    <Action
      title="Remove from Favorites"
      icon={Icon.StarDisabled}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      onAction={() => favoritesStore.remove(symbol)}
    />
  );
}
