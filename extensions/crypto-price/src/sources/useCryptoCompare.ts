import { mapValues } from "lodash";
import { Coin, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber, formatCurrency } from "#/utils";
import { COINS } from "#/constants";

interface CryptoCompareCurrencyData {
  PRICE: number;
  HIGH24HOUR: number;
  LOW24HOUR: number;
  VOLUME24HOURTO: number;
  CIRCULATINGSUPPLY: number;
  CIRCULATINGSUPPLYMKTCAP: number;
}

interface CryptoCompareResponse {
  RAW: Record<string, Record<string, CryptoCompareCurrencyData>>;
}

export const useCryptoCompare: UseSource = (currency, coinSymbols) => {
  const fsyms = coinSymbols.join(",");
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=${currency}`;
  const { isLoading, data, error } = useFetch<CryptoCompareResponse>(url);
  if (isLoading) {
    return { isLoading, coins: undefined };
  }
  if (error || !data) {
    return { isLoading: false, coins: undefined };
  }
  const coins = mapValues(data.RAW, (currencies, symbol: string) => {
    const d = currencies[currency];
    const coin: Coin = {
      name: COINS[symbol]?.name ?? symbol,
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
