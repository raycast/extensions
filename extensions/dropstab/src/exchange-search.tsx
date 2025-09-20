import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import {
  addToFavorites,
  removeFromFavoritesForExchanges,
  getFavorites,
} from "./commands/dropstabCoinsExchangesCommands";
import { useCryptoExchangesSearch, updateFavorites } from "./hooks/searchCryptoExchangesHooks";
import { MarketDetail } from "./types/coinExchangeType";
import { useDebounce } from "./hooks/useDebounce";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 500);
  const { results, isLoading } = useCryptoExchangesSearch(debouncedSearchText);
  const [favorites, setFavorites] = useState<MarketDetail[]>(getFavorites("favorites"));
  const [isFirstUpdate, setIsFirstUpdate] = useState(true); // Состояние для отслеживания первого обновления

  useEffect(() => {
    // Первое обновление через 2 секунды, затем каждые 20 секунд
    const timeoutDuration = isFirstUpdate ? 2000 : 20000;
    const firstUpdateTimeout = setTimeout(() => {
      updateFavorites(favorites, setFavorites);
      setIsFirstUpdate(false); // После первого обновления устанавливаем флаг в false
    }, timeoutDuration);

    // Очистка таймера при размонтировании компонента
    return () => {
      clearTimeout(firstUpdateTimeout);
    };
  }, [favorites, isFirstUpdate]);

  const handleAddToFavorites = (item: MarketDetail) => {
    addToFavorites(item, favorites, setFavorites, "favorites");
  };

  const handleRemoveFromFavorites = (item: MarketDetail) => {
    removeFromFavoritesForExchanges(item, favorites, setFavorites, "favorites");
  };

  return (
    <List searchBarPlaceholder="Search for trading pairs..." onSearchTextChange={setSearchText} isLoading={isLoading}>
      {searchText.length === 0 && favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((market) => (
            <List.Item
              key={market.id}
              title={`${market.base}${market.quote}`}
              subtitle={`Market: ${market.type} - Price: ${market.price.USD}$ - Volume: $${market.volume24h}`}
              icon={market.exchangeImage}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={market.link} />
                  <Action
                    title="Remove from Favorites"
                    onAction={() => handleRemoveFromFavorites(market)}
                    icon={Icon.Star}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {searchText.length > 0 &&
        results.map((result) => (
          <List.Section key={result.rank} title={`${result.name} (${result.symbol})`}>
            {result.markets.map((market: MarketDetail) => (
              <List.Item
                key={market.id}
                title={`${market.base}${market.quote}`}
                subtitle={`Market: ${market.type} - Price: ${market.price.USD}$ - Volume: $${market.volume24h}`}
                icon={market.exchangeImage}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={market.link} />
                    {favorites.some((fav) => fav.id === market.id) ? (
                      <Action
                        title="Remove from Favorites"
                        onAction={() => handleRemoveFromFavorites(market)}
                        icon={Icon.Star}
                      />
                    ) : (
                      <Action title="Add to Favorites" onAction={() => handleAddToFavorites(market)} icon={Icon.Star} />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
