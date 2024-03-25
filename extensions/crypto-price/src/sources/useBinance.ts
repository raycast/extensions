import { Coin, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber, formatCurrency } from "#/utils";

export const useBinance: UseSource = (currency, coinInfos) => {
  const symbols = JSON.stringify(coinInfos.map((v) => `${v.symbol}USDT`));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}&type=MINI`;
  const { isLoading, data } = useFetch<any>(url);
  if (isLoading) {
    return { isLoading, coins: undefined };
  }
  const coins = coinInfos.map((coinInfo) => {
    const d = data.find((v: any) => v.symbol.replace("USDT", "") === coinInfo.symbol);
    const coin: Coin = {
      ...coinInfo,
      price: parseFloat(d.lastPrice),
      high24h: parseFloat(d.highPrice),
      low24h: parseFloat(d.lowPrice),
      priceDisplay: formatCurrency(parseFloat(d.lastPrice), "USD"),
      more: {
        "Volume (24h)": formatLargeNumber(parseFloat(d.volume)),
      },
    };
    return coin;
  });
  return { isLoading, coins };
};
