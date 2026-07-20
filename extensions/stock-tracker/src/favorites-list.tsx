import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { Quote } from "./yahoo-finance";
import { FavoritesStore } from "./favorites-store";
import StockListItem from "./stock-list-item";
import { formatTime } from "./utils";

export default function FavoritesList({
  favorites,
  favoriteSymbols,
  favoritesStore,
  lastUpdated,
}: {
  favorites: Quote[];
  favoriteSymbols: string[];
  favoritesStore: FavoritesStore;
  lastUpdated: Date | null;
}) {
  return (
    <List.Section title="Favorites" subtitle={lastUpdated ? `Updated ${formatTime(lastUpdated)}` : undefined}>
      {favorites.map((quote) => (
        <StockListItem
          key={quote.symbol}
          quote={quote}
          actions={<FavouritesActions favorites={favoriteSymbols} quote={quote} favoritesStore={favoritesStore} />}
        />
      ))}
    </List.Section>
  );
}

interface FavouritesActionsProps {
  favorites: string[];
  quote: Quote;
  favoritesStore: FavoritesStore;
}

function FavouritesActions({ favorites, quote, favoritesStore }: FavouritesActionsProps) {
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
