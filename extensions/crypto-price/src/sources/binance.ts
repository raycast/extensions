import { Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { makeCoin } from "./coin";

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

// Binance quotes against USDT (~USD). Note: if any requested pair is invalid the
// whole request 400s — that throw is intentional, the orchestrator fails over.
export const fetchBinance: Fetcher = async (_currency, symbols) => {
  const pairs = symbols.map((s) => `${s}USDT`);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
    JSON.stringify(pairs),
  )}&type=MINI`;
  const data = await httpJson<BinanceTicker[]>(url);
  const coins: Coins = {};
  for (const d of data) {
    const symbol = d.symbol.replace(/USDT$/, "");
    coins[symbol] = makeCoin({
      symbol,
      price: parseFloat(d.lastPrice),
      high24h: parseFloat(d.highPrice),
      low24h: parseFloat(d.lowPrice),
      quoteCurrency: "USD",
      more: { "Volume (24h)": formatLargeNumber(parseFloat(d.quoteVolume)) },
    });
  }
  if (Object.keys(coins).length === 0) throw new Error("Binance: no coins returned");
  return coins;
};
