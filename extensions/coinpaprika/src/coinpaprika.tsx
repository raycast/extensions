import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getCoins } from "./api";
import { Coin } from "./types/coin";
import { FetchCoinDetails } from "./utils/coinDetails";
import { WEBSERVICE_URL } from "./enum";
import { addFavorite, getFavorites, removeFavorite } from "./utils/favorites";


interface ListItemProps {
  coinId: string,
  coin: Coin,
  isFavorite: boolean,
  onFavoriteToggle: () => void;
}

interface FavoriteProps {
  isFavorite: boolean,
  onToggle: () => void;
}

export default function Main() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function fetchCoins() {
      try {
        const coins = await getCoins.getAllCoins();
        setCoins(coins.slice(0, 1500));
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch the coin list" + e
        });
      }

      setIsLoading(false);
    }

    async function fetchFavorites() {
      const favoriteList = await getFavorites();
      setFavorites(favoriteList);
    }

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

          const singleCoin = coins.find(
            (coin) => coin.id === id
          );

          if (!singleCoin) return;

          return (
            <ListItemCoin
              coinId={id}
              coin={singleCoin}
              isFavorite={true}
              onFavoriteToggle={() => toggleFavorite(id, true)}
            />
          );

        })}

      </List.Section>

      <List.Section title="Coin List">

        {coins.map((coin: Coin) => {

          const isFavorite = favorites.includes(coin.id);

          return (
            <ListItemCoin
              coinId={coin.id}
              coin={coin}
              isFavorite={false}
              onFavoriteToggle={() => toggleFavorite(coin.id, isFavorite)}
            />
          );

        })}
      </List.Section>
    </List>
  );
}


function ListItemCoin({ coinId, coin, isFavorite, onFavoriteToggle }: ListItemProps) {

  return (
    <List.Item
      key={coinId}
      title={"#" + coin.rank + " | " + coin.name}
      icon={{
        source: isFavorite ? Icon.Star : Icon.ArrowRight,
        tintColor: isFavorite ? Color.Yellow : Color.SecondaryText
      }}
      subtitle={coin.symbol.toUpperCase()}
      detail={<FetchCoinDetails coinId={coin.id} />}
      actions={
        <ActionPanel>
          <FavoriteAction isFavorite={isFavorite} onToggle={onFavoriteToggle} />
          <Action.OpenInBrowser url={WEBSERVICE_URL + coin.id} />
        </ActionPanel>
      }
    />
  );
}

function FavoriteAction(props: FavoriteProps) {
  const { isFavorite, onToggle } = props;
  const title = isFavorite ? "Remove from Favorites" : "Add to Favorites";
  return <Action icon={Icon.Star} title={title} onAction={onToggle} />;
}
