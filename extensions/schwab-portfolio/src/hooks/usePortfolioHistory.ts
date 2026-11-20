import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getPriceHistory } from "../lib/schwab-client";
import { getTimeframe } from "../lib/constants";
import type { Account, Position } from "../types/accounts";
import type { Candle } from "../types/quotes";

interface PortfolioHistoryResult {
  candles: Candle[];
  totalCash: number;
  positions: Position[];
}

interface SymbolEntry {
  symbol: string;
  quantity: number;
}

export function usePortfolioHistory(accounts: Account[], timeframeValue: string) {
  // Extract unique equity/ETF symbols with aggregated quantities + total cash
  const { entries, totalCash, positions } = useMemo(() => {
    const map = new Map<string, number>();
    let cash = 0;
    const pos: Position[] = [];

    for (const account of accounts) {
      const sa = account.securitiesAccount;
      cash += sa.currentBalances?.cashBalance ?? sa.currentBalances?.totalCash ?? 0;

      for (const position of sa.positions ?? []) {
        const { assetType, symbol } = position.instrument;
        if (assetType !== "EQUITY" && assetType !== "ETF") continue;

        const qty = (position.longQuantity ?? 0) - (position.shortQuantity ?? 0);
        map.set(symbol, (map.get(symbol) ?? 0) + qty);
        pos.push(position);
      }
    }

    const sorted: SymbolEntry[] = Array.from(map.entries())
      .map(([symbol, quantity]) => ({ symbol, quantity }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    return { entries: sorted, totalCash: cash, positions: pos };
  }, [accounts]);

  const { data, isLoading, error } = useCachedPromise(
    // timeframe must be a hook argument (not just closed over) so that
    // changing it triggers a refetch instead of reusing the cache.
    async (syms: SymbolEntry[], cash: number, timeframe: string) => {
      const tf = getTimeframe(timeframe);
      // Fetch price history for all symbols in parallel
      const histories = await Promise.all(
        syms.map((entry) =>
          getPriceHistory(entry.symbol, tf.periodType, tf.period, tf.frequencyType, tf.frequency).then((history) => ({
            ...entry,
            candles: history.candles,
          })),
        ),
      );

      if (histories.some((history) => !history.candles.length)) {
        throw new Error("Some holdings have no price history for this period. A complete estimate is unavailable.");
      }
      // Begin only after every holding has a price; never backfill before listing.
      const commonStart = Math.max(...histories.map((history) => Math.min(...history.candles.map((c) => c.datetime))));
      const allTimestamps = Array.from(
        new Set(histories.flatMap((history) => history.candles.map((candle) => candle.datetime))),
      )
        .filter((timestamp) => timestamp >= commonStart)
        .sort((a, b) => a - b);

      const alignedValues = histories.map(({ quantity, candles }) => {
        const sortedCandles = [...candles].sort((a, b) => a.datetime - b.datetime);
        let cursor = 0;
        let carriedClose = sortedCandles[0].close;

        return allTimestamps.map((timestamp) => {
          while (cursor < sortedCandles.length && sortedCandles[cursor].datetime <= timestamp) {
            carriedClose = sortedCandles[cursor++].close;
          }
          return carriedClose * quantity;
        });
      });

      const candles: Candle[] = allTimestamps.map((datetime, index) => {
        const positionsValue = alignedValues.reduce((sum, values) => sum + values[index], 0);
        const value = Number((positionsValue + cash).toFixed(2));
        return { datetime, open: value, high: value, low: value, close: value, volume: 0 };
      });

      const result: PortfolioHistoryResult = { candles, totalCash: cash, positions: [] };
      return result;
    },
    [entries, totalCash, timeframeValue],
    {
      keepPreviousData: false,
      execute: entries.length > 0,
    },
  );

  // Attach positions to the result (not cached since they come from accounts)
  const result = useMemo(() => {
    if (!data || !entries.length) return undefined;
    return { ...data, positions };
  }, [data, positions, entries.length]);

  return { data: error ? undefined : result, isLoading, error };
}
