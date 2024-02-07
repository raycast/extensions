import { Data, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber } from "#/utils";

export const useCryptoCompare: UseSource = (currency: string) => {
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=${currency}`;
  const { isLoading, data: rawData } = useFetch<any>(url);
  if (isLoading) {
    return { isLoading, data: undefined };
  }
  const d = rawData.RAW.BTC[currency];
  const data: Data = {
    basic: {
      price: d.PRICE,
      high24h: d.HIGH24HOUR,
      low24h: d.LOW24HOUR,
    },
    more: {
      "Volume (24h)": formatLargeNumber(d.VOLUME24HOURTO),
      "Circulating Supply": formatLargeNumber(d.CIRCULATINGSUPPLY),
      "Circulating Market Cap": formatLargeNumber(d.CIRCULATINGSUPPLYMKTCAP),
    },
  };
  return { isLoading, data };
};
