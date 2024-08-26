import { ActionPanel, List, Icon, Action, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { useSearch } from "./commands/raycastCommands";
import {
  getFavorites,
  addToFavorites,
  removeFromFavoritesForCoins,
  isFavoriteForCoins,
} from "./commands/dropstabCoinsCommands";
import { SearchResult } from "./types/coinType";

const CRYPTO_FAVORITES_KEY = "cryptoFavorites";

export default function Command() {
  const { state, search, updateCoinData } = useSearch();
  const [favorites, setFavorites] = useState<SearchResult[]>(() => getFavorites(CRYPTO_FAVORITES_KEY));

  useEffect(() => {
    const interval = setInterval(() => {
      updateCoinData(favorites, setFavorites);
    }, 30000); // Обновление каждые 30 секунд

    return () => clearInterval(interval);
  }, [favorites]);

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      {!state.query && favorites.length > 0 && (
        <List.Section title="Favorites:">
          {favorites.map((favorite) => (
            <SearchListItem
              key={favorite.id}
              searchResult={favorite}
              favorites={favorites}
              setFavorites={setFavorites}
              addToFavorites={(item) => addToFavorites(item, favorites, setFavorites, CRYPTO_FAVORITES_KEY)}
              removeFromFavoritesForCoins={(item) =>
                removeFromFavoritesForCoins(item, favorites, setFavorites, CRYPTO_FAVORITES_KEY)
              }
              isFavoriteForCoins={(item) => isFavoriteForCoins(item, favorites)}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={state.query ? "Results:" : "Trending:"}>
        {state.results &&
          state.results.map((searchResult) => (
            <SearchListItem
              key={searchResult.id}
              searchResult={searchResult}
              favorites={favorites}
              setFavorites={setFavorites}
              addToFavorites={(item) => addToFavorites(item, favorites, setFavorites, CRYPTO_FAVORITES_KEY)}
              removeFromFavoritesForCoins={(item) =>
                removeFromFavoritesForCoins(item, favorites, setFavorites, CRYPTO_FAVORITES_KEY)
              }
              isFavoriteForCoins={(item) => isFavoriteForCoins(item, favorites)}
            />
          ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  favorites,
  setFavorites,
  addToFavorites,
  removeFromFavoritesForCoins,
  isFavoriteForCoins,
}: {
  searchResult: SearchResult;
  favorites: SearchResult[];
  setFavorites: (favorites: SearchResult[]) => void;
  addToFavorites: (
    item: SearchResult,
    favorites: SearchResult[],
    setFavorites: (favorites: SearchResult[]) => void,
    key: string,
  ) => void;
  removeFromFavoritesForCoins: (
    item: SearchResult,
    favorites: SearchResult[],
    setFavorites: (favorites: SearchResult[]) => void,
    key: string,
  ) => void;
  isFavoriteForCoins: (item: SearchResult) => boolean;
}) {
  if (!searchResult || !searchResult.id) {
    return null;
  }

  return (
    <List.Item
      key={searchResult.id}
      icon={{ source: searchResult.icon || "", mask: Image.Mask.RoundedRectangle }}
      title={`${searchResult.symbol}`} // Изменено для отображения rank перед символом
      subtitle={searchResult.name}
      accessories={[{ text: `${searchResult.rank} | ${searchResult.price} | ${searchResult.marketCap}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Dropstab" url={searchResult.url} icon="dropstab-logo.png" />
            {isFavoriteForCoins(searchResult) ? (
              <ActionPanel.Item
                title="Remove from Favorites"
                onAction={() =>
                  removeFromFavoritesForCoins(searchResult, favorites, setFavorites, CRYPTO_FAVORITES_KEY)
                }
                icon={Icon.Star}
              />
            ) : (
              <ActionPanel.Item
                title="Add to Favorites"
                onAction={() => addToFavorites(searchResult, favorites, setFavorites, CRYPTO_FAVORITES_KEY)}
                icon={Icon.Star}
              />
            )}
            {searchResult.twitter && (
              <Action.OpenInBrowser
                title="Open Twitter"
                url={searchResult.twitter}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                icon="twitter.png"
              />
            )}
            {searchResult.website && (
              <Action.OpenInBrowser
                title="Open Website"
                url={searchResult.website}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
