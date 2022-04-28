import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getCoins } from "./api";
import { Coin } from "./types/coin";
import { FetchCoinDetails } from "./utils/coinDetails";
import { WEBSERVICE_URL } from "./enum";

export default function Main() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [showingDetail, setShowingDetail] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

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

    fetchCoins();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      enableFiltering={true}
      navigationTitle="Coinpaprika Cryptocurrencies"
      searchBarPlaceholder="Search for your favourite Coin"
    >
      {coins.map((coin: Coin) => (
        <List.Item
          key={coin.id}
          title={"#" + coin.rank + " | " + coin.name}
          icon={{ source: Icon.ArrowRight, tintColor: Color.SecondaryText }}
          subtitle={coin.symbol.toUpperCase()}
          detail={<FetchCoinDetails coinId={coin.id} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={WEBSERVICE_URL + coin.id} />
              <Action title="Toggle Detail" icon={Icon.EyeSlash} onAction={() => setShowingDetail(!showingDetail)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
