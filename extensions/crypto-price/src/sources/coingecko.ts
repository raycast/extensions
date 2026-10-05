import { Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { COINS } from "#/constants";
import { makeCoin } from "./coin";

interface GeckoMarket {
  id: string;
  symbol: string;
  current_price: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
}

// The only source that quotes in true fiat (USD/EUR/GBP/JPY/BRL...), so it honors the
// currency preference. Requires a symbol -> CoinGecko id map; unmapped symbols are skipped.
export const fetchCoinGecko: Fetcher = async (currency, symbols) => {
  const symbolByGeckoId = new Map<string, string>();
  for (const s of symbols) {
    const id = COINS[s]?.geckoId;
    if (id) symbolByGeckoId.set(id, s);
  }
  if (symbolByGeckoId.size === 0) throw new Error("CoinGecko: no mappable symbols");

  const ids = [...symbolByGeckoId.keys()].join(",");
  const vs = currency.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs}&ids=${ids}`;
  const data = await httpJson<GeckoMarket[]>(url);

  const coins: Coins = {};
  for (const d of data) {
    const symbol = symbolByGeckoId.get(d.id) ?? d.symbol.toUpperCase();
    coins[symbol] = makeCoin({
      symbol,
      price: d.current_price,
      high24h: d.high_24h,
      low24h: d.low_24h,
      quoteCurrency: currency,
      more: { "Volume (24h)": formatLargeNumber(d.total_volume) },
    });
  }
  if (Object.keys(coins).length === 0) throw new Error("CoinGecko: empty response");
  return coins;
};
