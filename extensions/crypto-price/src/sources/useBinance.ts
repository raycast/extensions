import { Coin, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber, formatCurrency } from "#/utils";
import { COINS } from "#/constants";

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

export const useBinance: UseSource = (currency, coinSymbols) => {
  const symbols = JSON.stringify(coinSymbols.map((symbol) => `${symbol}USDT`));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}&type=MINI`;
  const { isLoading, data, error } = useFetch<BinanceTicker[]>(url);
  if (isLoading) {
    return { isLoading, coins: undefined };
  }
  if (error || !data) {
    return { isLoading: false, coins: undefined };
  }
  const coins = Object.fromEntries(
    data.map((d) => {
      const symbol = d.symbol.replace("USDT", "");
      const coin: Coin = {
        name: COINS[symbol]?.name ?? symbol,
        symbol,
        price: parseFloat(d.lastPrice),
        high24h: parseFloat(d.highPrice),
        low24h: parseFloat(d.lowPrice),
        priceDisplay: formatCurrency(parseFloat(d.lastPrice), "USD"),
        more: {
          "Volume (24h)": formatLargeNumber(parseFloat(d.volume)),
        },
      };
      return [symbol, coin];
    }),
  );
  return { isLoading, coins };
};
