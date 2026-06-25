import { Coins, Fetcher } from "#/types";
import { httpJson, formatLargeNumber } from "#/utils";
import { makeCoin } from "./coin";

interface OkxTicker {
  instId: string;
  last: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
}
interface OkxResponse {
  code: string;
  data?: OkxTicker[];
}

// OKX has no multi-instrument ticker endpoint, so fetch each pair in parallel and
// keep whatever resolves. Quotes against USDT (~USD).
export const fetchOKX: Fetcher = async (_currency, symbols) => {
  const results = await Promise.all(
    symbols.map(async (s) => {
      try {
        const res = await httpJson<OkxResponse>(`https://www.okx.com/api/v5/market/ticker?instId=${s}-USDT`);
        const t = res.code === "0" ? res.data?.[0] : undefined;
        if (!t) return undefined;
        return makeCoin({
          symbol: s,
          price: parseFloat(t.last),
          high24h: parseFloat(t.high24h),
          low24h: parseFloat(t.low24h),
          quoteCurrency: "USD",
          more: { "Volume (24h)": formatLargeNumber(parseFloat(t.volCcy24h)) },
        });
      } catch {
        return undefined;
      }
    }),
  );
  const coins: Coins = {};
  for (const c of results) if (c) coins[c.symbol] = c;
  if (Object.keys(coins).length === 0) throw new Error("OKX: no coins returned");
  return coins;
};
