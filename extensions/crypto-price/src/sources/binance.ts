import { Coin, Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { makeCoin } from "./coin";

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

const BASE = "https://api.binance.com/api/v3/ticker/24hr";

function toCoin(d: BinanceTicker): Coin {
  return makeCoin({
    symbol: d.symbol.replace(/USDT$/, ""),
    price: parseFloat(d.lastPrice),
    high24h: parseFloat(d.highPrice),
    low24h: parseFloat(d.lowPrice),
    quoteCurrency: "USD",
    more: { "Volume (24h)": formatLargeNumber(parseFloat(d.quoteVolume)) },
  });
}

// Binance quotes against USDT (~USD). The batch endpoint 400s if ANY requested symbol is
// invalid, so on failure we retry per-symbol in parallel and keep the valid coins (dropping
// only the unknown ones). Binance is the default source, so one obscure symbol shouldn't make
// it skip the user's valid coins.
export const fetchBinance: Fetcher = async (_currency, symbols) => {
  const pairs = symbols.map((s) => `${s}USDT`);
  const coins: Coins = {};

  try {
    const url = `${BASE}?symbols=${encodeURIComponent(JSON.stringify(pairs))}&type=MINI`;
    for (const d of await httpJson<BinanceTicker[]>(url)) {
      const coin = toCoin(d);
      coins[coin.symbol] = coin;
    }
  } catch {
    const results = await Promise.all(
      pairs.map(async (pair) => {
        try {
          return toCoin(await httpJson<BinanceTicker>(`${BASE}?symbol=${pair}&type=MINI`));
        } catch {
          return undefined;
        }
      }),
    );
    for (const coin of results) if (coin) coins[coin.symbol] = coin;
  }

  if (Object.keys(coins).length === 0) throw new Error("Binance: no coins returned");
  return coins;
};
