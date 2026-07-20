import { Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { makeCoin } from "./coin";

interface CryptoCompareData {
  PRICE: number;
  HIGH24HOUR: number;
  LOW24HOUR: number;
  VOLUME24HOURTO: number;
  CIRCULATINGSUPPLY: number;
  CIRCULATINGSUPPLYMKTCAP: number;
}
interface CryptoCompareResponse {
  RAW?: Record<string, Record<string, CryptoCompareData>>;
  Response?: string;
  Message?: string;
}

// CryptoCompare quotes in true fiat but its public API now requires an API key
// (free CCData key). Only built into the chain when a key is configured.
export function makeCryptoCompare(apiKey: string): Fetcher {
  return async (currency, symbols) => {
    const fsyms = symbols.join(",");
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=${currency}`;
    const data = await httpJson<CryptoCompareResponse>(url, {
      headers: { authorization: `Apikey ${apiKey}` },
    });
    if (!data.RAW) throw new Error(`CryptoCompare: ${data.Message ?? "no data"}`);

    const coins: Coins = {};
    for (const [symbol, byCurrency] of Object.entries(data.RAW)) {
      const d = byCurrency[currency];
      if (!d) continue;
      coins[symbol] = makeCoin({
        symbol,
        price: d.PRICE,
        high24h: d.HIGH24HOUR,
        low24h: d.LOW24HOUR,
        quoteCurrency: currency,
        more: {
          "Volume (24h)": formatLargeNumber(d.VOLUME24HOURTO),
          "Circulating Supply": formatLargeNumber(d.CIRCULATINGSUPPLY),
          "Circulating Market Cap": formatLargeNumber(d.CIRCULATINGSUPPLYMKTCAP),
        },
      });
    }
    if (Object.keys(coins).length === 0) throw new Error("CryptoCompare: empty response");
    return coins;
  };
}
