import { CryptoCurrency, PriceData } from "../types";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import CurrencyConverter from "./CurrencyConverter";

const BASE_URL = "https://coinmarketcap.com/currencies/";

type CoinListItemProps = {
  name: string;
  slug: string;
  symbol: string;
  coinPriceStore: { [key: string]: PriceData };
  addFavoriteCoin: (coin: CryptoCurrency) => void;
  removeFavoriteCoin: (coin: CryptoCurrency) => void;
  refreshCoinPrice: () => void;
  isFavorite: boolean;
};

export default function CoinListItem({
  name,
  slug,
  symbol,
  coinPriceStore,
  addFavoriteCoin,
  refreshCoinPrice,
  isFavorite,
  removeFavoriteCoin,
}: CoinListItemProps) {
  const coinPrice = coinPriceStore[slug];
  const { push } = useNavigation();

  let accessoryTitle;
  if (coinPrice) {
    const symbol = coinPrice.isUp ? "+" : "-";
    accessoryTitle = `${coinPrice.currencyPrice}, ${symbol}${coinPrice.priceDiff}`;
  }

  const price = useMemo(() => {
    if (coinPrice?.currencyPrice) {
      return parseFloat(coinPrice.currencyPrice.replace(/[$,]/g, ""));
    }
  }, [coinPrice]);

  return (
    <List.Item
      id={`${slug}_${symbol}`}
      title={name}
      icon={{
        source: Icon.Star,
        tintColor: isFavorite ? Color.Yellow : Color.PrimaryText,
      }}
      subtitle={`$${symbol.toUpperCase()}`}
      accessories={[{ text: accessoryTitle }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${BASE_URL}${slug}`} />

          {!!price && (
            <Action
              title="Convert Currency"
              icon={Icon.QuestionMark}
              onAction={() => {
                push(<CurrencyConverter coinPrice={price} symbol={symbol} name={name} />);
              }}
            />
          )}

          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => {
              if (isFavorite) {
                removeFavoriteCoin({ name, slug, symbol });
              } else {
                addFavoriteCoin({ name, slug, symbol });
              }
            }}
          />
          <Action title="Refresh Price" onAction={() => refreshCoinPrice()} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    />
  );
}
