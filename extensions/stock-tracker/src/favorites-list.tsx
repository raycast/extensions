import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useEffect } from "react";
import { Quote } from "./yahoo-finance";
import { FavoritesStore, useFavoritesQuotes } from "./favorites-store";
import StockListItem from "./stock-list-item";

export default function FavoritesList({ handleLoading }: { handleLoading: (isLoading: boolean) => void }) {
  const { favorites, favoritesStore, isLoading } = useFavoritesQuotes();
  useEffect(() => {
    handleLoading(isLoading);
  }, [isLoading]);

  return (
    <List.Section title="Favorites">
      {favorites.map((quote) => (
        <StockListItem
          key={quote.symbol}
          quote={quote}
          actions={
            <FavouritesActions
              favorites={favorites.map((f) => f.symbol!)}
              quote={quote}
              favoritesStore={favoritesStore}
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
