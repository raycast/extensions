import { Data, UseSource } from "#/types";
import { useFetch } from "@raycast/utils";
import { formatLargeNumber } from "#/utils";

function createUseBinace(sourceName: string) {
  const baseUrl = sourceName === "Spot" ? `https://api.binance.com/api/v3` : `https://fapi.binance.com/fapi/v1`;
  const useBinance: UseSource = () => {
    const url = `${baseUrl}/ticker/24hr?symbol=BTCUSDT`;
    const { isLoading, data: d } = useFetch<any>(url);
    if (isLoading) {
      return { isLoading, data: undefined };
    }
    const data: Data = {
      basic: {
        price: parseInt(d.lastPrice),
        high24h: parseInt(d.highPrice),
        low24h: parseInt(d.lowPrice),
      },
      more: {
        "Volume (24h)": formatLargeNumber(parseInt(d.volume)),
      },
    };
    return { isLoading, data };
  };
  return useBinance;
}

export const useBinanceSpot = createUseBinace("Spot");
export const useBinanceFutures = createUseBinace("Futures");
