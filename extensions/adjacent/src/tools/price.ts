import { listEventMarketPrices, listPrices } from '../lib/api';
import { defaultTimeframe, type Timeframe } from '../lib/prefs';
import { sortSeries, summarizeSeries } from '../lib/format';
import type { PriceEntityType } from '../lib/types';

type Input = {
  type: PriceEntityType;
  id: string;
  /** Human window: 15m, 30m, 1h, 6h, 12h, 24h, 7d, 30d, 90d. */
  timeframe?: Timeframe;
  /** Return the full point series instead of a compact summary. */
  raw?: boolean;
};

/** Price history for an index, rate, market, or event. */
export default async function tool(input: Input) {
  const timeframe = input.timeframe ?? defaultTimeframe();
  if (input.type === 'event') {
    const rows = await listEventMarketPrices(input.id, timeframe, 10);
    return rows.map((row) => {
      const chronological = sortSeries(row.points);
      return {
        market_id: row.market.market_id,
        question: row.market.question,
        summary: summarizeSeries(chronological),
        points: input.raw ? chronological : undefined,
      };
    });
  }

  const page = await listPrices(input.type, input.id, timeframe);
  const chronological = sortSeries(page.data);
  return {
    id: input.id,
    type: input.type,
    timeframe,
    summary: summarizeSeries(chronological),
    points: input.raw ? chronological : chronological.slice(-8),
  };
}
