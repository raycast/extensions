import { Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { makeCoin } from "./coin";

interface CoinbaseStats {
  last: string;
  high: string;
  low: string;
  volume: string;
}

// Coinbase Exchange has a per-product stats endpoint, so fetch each pair in parallel.
// Quotes against USD. Some assets (e.g. BNB) aren't listed and just get skipped.
export const fetchCoinbase: Fetcher = async (_currency, symbols) => {
  const results = await Promise.all(
    symbols.map(async (s) => {
      try {
        const d = await httpJson<CoinbaseStats>(`https://api.exchange.coinbase.com/products/${s}-USD/stats`);
        if (!d?.last) return undefined;
        return makeCoin({
          symbol: s,
          price: parseFloat(d.last),
          high24h: parseFloat(d.high),
          low24h: parseFloat(d.low),
          quoteCurrency: "USD",
          more: { "Volume (24h)": formatLargeNumber(parseFloat(d.volume)) },
        });
      } catch {
        return undefined;
      }
    }),
  );
  const coins: Coins = {};
  for (const c of results) if (c) coins[c.symbol] = c;
  if (Object.keys(coins).length === 0) throw new Error("Coinbase: no coins returned");
  return coins;
};
