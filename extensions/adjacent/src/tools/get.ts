import { getEvent, getIndex, getMarket, getNews, getRate } from '../lib/api';
import type { EntityType } from '../lib/types';

type Input = {
  /** What to fetch: index, rate, event, market, or news. */
  type: EntityType;
  /** Prefixed market/event id (`kalshi:…`) or index/rate/news slug. */
  id: string;
};

/** Fetch full detail for one Adjacent entity by type and id. */
export default async function tool(input: Input) {
  switch (input.type) {
    case 'market':
      return getMarket(input.id);
    case 'event':
      return getEvent(input.id);
    case 'index':
      return getIndex(input.id);
    case 'rate':
      return getRate(input.id);
    case 'news':
      return getNews(input.id);
  }
}
