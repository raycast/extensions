import { Coin, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber, formatCurrency } from "#/utils";

export const useCryptoCompare: UseSource = (currency, coinInfos) => {
  const fsyms = coinInfos.map((v) => v.symbol).join(",");
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=${currency}`;
  const { isLoading, data } = useFetch<any>(url);
  if (isLoading) {
    return { isLoading, coins: undefined };
  }
  const coins = coinInfos.map((coinInfo) => {
    const d = data.RAW[coinInfo.symbol][currency];
    const coin: Coin = {
      ...coinInfo,
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
