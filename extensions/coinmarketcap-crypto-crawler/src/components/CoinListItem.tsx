import { CryptoCurrency, PriceData, PriceDirection } from "../types";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import CurrencyConverter from "./CurrencyConverter";
import useCoinWatchList from "../utils/useCoinWatchList";

const BASE_URL = "https://coinmarketcap.com/currencies/";

type CoinListItemProps = {
  name: string;
  slug: string;
  symbol: string;
  coinPriceStore: { [key: string]: PriceData };
  addToWatchList: (coin: CryptoCurrency) => void;
  removeFromWatchList: (coin: CryptoCurrency) => void;
  refreshCoinPrice: () => void;
  isWatchList: boolean;
};

export default function CoinListItem({
  name,
  slug,
  symbol,
  coinPriceStore,
  addToWatchList,
  refreshCoinPrice,
  isWatchList,
  removeFromWatchList,
}: CoinListItemProps) {
  const coinPrice = coinPriceStore[slug];
  const { push } = useNavigation();
  const { clearWatchList } = useCoinWatchList();
  let accessoryTitle;
  let directionSymbol;
  let directionColor;

  if (coinPrice) {
    if (coinPrice.direction) {
      directionSymbol = coinPrice.direction === PriceDirection.UP ? "+" : "-";
      directionColor = coinPrice.direction === PriceDirection.UP ? Color.Green : Color.Red;
    } else {
      directionSymbol = "";
      directionColor = Color.PrimaryText;
    }

    accessoryTitle = `${coinPrice.currencyPrice}, ${directionSymbol}${coinPrice.priceDiff}`;
  }

  const price = useMemo(() => {
    if (coinPrice?.currencyPrice) {
      return parseFloat(coinPrice.currencyPrice.replace(/[$,]/g, ""));
    }
  }, [coinPrice]);

  return (
    <List.Item
      id={`${slug}_${symbol}_${name}`}
      title={name}
      icon={{
        source: Icon.Star,
        tintColor: isWatchList ? Color.Yellow : Color.PrimaryText,
      }}
      subtitle={`$${symbol.toUpperCase()}`}
      accessories={
        accessoryTitle
          ? [
              {
                tag: {
                  value: accessoryTitle,
                  color: directionColor,
                },
              },
            ]
          : []
      }
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
            title={isWatchList ? "Remove from Watchlist" : "Add to Watchlist"}
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onAction={() => {
              if (isWatchList) {
                removeFromWatchList({ name, slug, symbol });
              } else {
                addToWatchList({ name, slug, symbol });
              }
            }}
          />

          {isWatchList && (
            <Action
              title="Clear Watchlist"
              icon={Icon.Trash}
              onAction={() => {
                clearWatchList();
              }}
            />
          )}
          <Action title="Refresh Price" onAction={() => refreshCoinPrice()} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    />
  );
}
