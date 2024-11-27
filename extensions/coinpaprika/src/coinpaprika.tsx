import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getCoins } from "./api";
import { Coin } from "./types/coin";
import { FetchCoinDetails } from "./utils/coinDetails";
import { WEBSERVICE_URL } from "./enum";
import {
  addFavorite,
  getFavorites,
  getShowFavoritesInCoinList,
  removeFavorite,
  setShowFavoritesInCoinList,
} from "./utils/favorites";

interface ListItemProps {
  coin: Coin;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  showFavorites: boolean;
  onShowFavoritesToggle: () => void;
}

interface FavoriteProps {
  isFavorite: boolean;
  onToggle: () => void;
}

interface ShowFavoritesProps {
  showFavorites: boolean;
  onToggle: () => void;
}

export default function Main() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState<boolean>(true);

  useEffect(() => {
    async function fetchCoins() {
      try {
        const coins = await getCoins.getAllCoins();
        setCoins(coins.slice(0, 1500));
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch the coin list" + e,
        });
      }

      setIsLoading(false);
    }

    async function fetchFavorites() {
      const favoriteList = await getFavorites();
      setFavorites(favoriteList);
    }

    async function setShowFavoritesOption() {
      const showFavorites = await getShowFavoritesInCoinList();
      setShowFavorites(showFavorites);
    }

    setShowFavoritesOption();
    fetchFavorites();
    fetchCoins();
  }, []);

  async function toggleFavorite(id: string, isFavorite: boolean) {
    if (isFavorite) {
      await removeFavorite(id);
    } else {
      await addFavorite(id);
    }

    const favoriteList = await getFavorites();
    setFavorites(favoriteList);
  }

  async function toggleShowFavoritesInCoinList() {
    const showFavorites = (await getShowFavoritesInCoinList()) || false;
    const toggledShowFavorites = !showFavorites;

    await setShowFavoritesInCoinList(toggledShowFavorites);
    setShowFavorites(toggledShowFavorites);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      enableFiltering={true}
      navigationTitle="Coinpaprika Cryptocurrencies"
      searchBarPlaceholder="Search for crypto name"
    >
      <List.Section title="Favorites">
        {favorites.map((id) => {
          const favoriteCoin = coins.find((coin) => coin.id === id);

          if (!favoriteCoin) return;

          return (
            <ListItemCoin
              key={id}
              coin={favoriteCoin}
              isFavorite={true}
              onFavoriteToggle={() => toggleFavorite(id, true)}
              showFavorites={showFavorites}
              onShowFavoritesToggle={() => toggleShowFavoritesInCoinList()}
            />
          );
        })}
      </List.Section>

      <List.Section title="Coin List">
        {coins.map((coin: Coin) => {
          const isFavorite = favorites.includes(coin.id);

          if (isFavorite && !showFavorites) return;

          return (
            <ListItemCoin
              key={coin.id}
              coin={coin}
              isFavorite={isFavorite}
              onFavoriteToggle={() => toggleFavorite(coin.id, isFavorite)}
              showFavorites={showFavorites}
              onShowFavoritesToggle={() => toggleShowFavoritesInCoinList()}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ListItemCoin({ coin, isFavorite, onFavoriteToggle, showFavorites, onShowFavoritesToggle }: ListItemProps) {
  return (
    <List.Item
      key={coin.id}
      title={coin.name}
      icon={{
        source: isFavorite ? Icon.Star : Icon.ArrowRight,
        tintColor: isFavorite ? Color.Yellow : Color.SecondaryText,
      }}
      subtitle={coin.symbol.toUpperCase()}
      accessories={[{ text: `#${coin.rank}` }]}
      detail={<FetchCoinDetails coinId={coin.id} />}
      actions={
        <ActionPanel>
          <FavoriteAction isFavorite={isFavorite} onToggle={onFavoriteToggle} />
          <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={WEBSERVICE_URL + coin.id} />
          <ListFavoriteAction showFavorites={showFavorites} onToggle={onShowFavoritesToggle} />
        </ActionPanel>
      }
    />
  );
}

function FavoriteAction(props: FavoriteProps) {
  const { isFavorite, onToggle } = props;
  const title = isFavorite ? "Remove From Favorites" : "Add To Favorites";

  return <Action icon={Icon.Star} title={title} shortcut={{ modifiers: ["cmd"], key: "f" }} onAction={onToggle} />;
}

function ListFavoriteAction(props: ShowFavoritesProps) {
  const { showFavorites, onToggle } = props;
  const icon = showFavorites ? `${Icon.EyeSlash}` : `${Icon.Eye}`;
  const title = showFavorites ? "Hide Favorites in Coin List" : "Show Favorites in Coin List";
  return <Action icon={icon} title={title} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} onAction={onToggle} />;
}
