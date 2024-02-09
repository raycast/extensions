import { Coin, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber, formatCurrency } from "#/utils";
import { mapValues } from "lodash-es";

export const useCryptoCompare: UseSource = (currency, coinSymbols) => {
  const fsyms = coinSymbols.join(",");
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=${currency}`;
  const { isLoading, data } = useFetch<any>(url);
  if (isLoading) {
    return { isLoading, coins: undefined };
  }
  const coins = mapValues(data.RAW, (currencies: any, symbol: string) => {
    const d = currencies[currency];
    const coin: Coin = {
      symbol,
      price: d.PRICE,
      high24h: d.HIGH24HOUR,
      low24h: d.LOW24HOUR,
      priceDisplay: formatCurrency(d.PRICE, currency),
      more: {
        "Volume (24h)": formatLargeNumber(d.VOLUME24HOURTO),
        "Circulating Supply": formatLargeNumber(d.CIRCULATINGSUPPLY),
        "Circulating Market Cap": formatLargeNumber(d.CIRCULATINGSUPPLYMKTCAP),
      },
    };
    return coin;
  });
  return { isLoading, coins };
};
