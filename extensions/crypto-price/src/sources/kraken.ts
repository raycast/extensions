import { Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { COINS } from "#/constants";
import { makeCoin } from "./coin";

interface KrakenEntry {
  c: string[]; // [last price, lot volume]
  h: string[]; // [today high, 24h high]
  l: string[]; // [today low, 24h low]
  v: string[]; // [today volume, 24h volume]
}
interface KrakenResponse {
  error: string[];
  result?: Record<string, KrakenEntry>;
}

// Kraken returns a batch in one call but renames a few assets (BTC -> XBT) and echoes
// its own pair keys, so we map symbol<->base both ways. Quotes against USDT (~USD).
export const fetchKraken: Fetcher = async (_currency, symbols) => {
  const symbolByBase = new Map<string, string>();
  const pairs: string[] = [];
  for (const s of symbols) {
    const base = COINS[s]?.krakenBase ?? s;
    symbolByBase.set(base, s);
    pairs.push(`${base}USDT`);
  }

  const res = await httpJson<KrakenResponse>(`https://api.kraken.com/0/public/Ticker?pair=${pairs.join(",")}`);
  if (res.error?.length) throw new Error(`Kraken: ${res.error.join(", ")}`);

  const coins: Coins = {};
  for (const [key, t] of Object.entries(res.result ?? {})) {
    const base = key.replace(/(USDT|ZUSD|USD)$/i, "");
    const symbol = symbolByBase.get(base);
    if (!symbol) continue;
    coins[symbol] = makeCoin({
      symbol,
      price: parseFloat(t.c[0]),
      high24h: parseFloat(t.h[1]),
      low24h: parseFloat(t.l[1]),
      quoteCurrency: "USD",
      more: { "Volume (24h)": formatLargeNumber(parseFloat(t.v[1])) },
    });
  }
  if (Object.keys(coins).length === 0) throw new Error("Kraken: no coins matched");
  return coins;
};
