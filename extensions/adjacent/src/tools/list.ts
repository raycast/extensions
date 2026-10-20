import { listEvents, listIndices, listMarkets, listNews, listRates } from '../lib/api';
import type { EntityType } from '../lib/types';

type Input = {
  /** What to list. Defaults to event. */
  type?: EntityType;
  search?: string;
  page?: number;
  per_page?: number;
};

/** Browse Adjacent events, markets, indices, rates, or latest news. */
export default async function tool(input: Input) {
  const params = {
    search: input.search,
    page: input.page,
    per_page: input.per_page ?? 20,
  };
  switch (input.type ?? 'event') {
    case 'market':
      return listMarkets(params);
    case 'event':
      return listEvents(params);
    case 'index':
      return listIndices(params);
    case 'rate':
      return listRates(params);
    case 'news':
      return listNews(params);
  }
}
