import { List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { listRelatedNews, peekTickerMap, tickersFor } from '../lib/api';
import type { PriceEntityType } from '../lib/types';
import { ErrorView } from './empty';
import { NewsItem } from './items';

export function RelatedNewsList({
  type,
  id,
  title,
}: {
  type: PriceEntityType;
  id: string;
  title: string;
}) {
  const { data, isLoading, error } = useCachedPromise(listRelatedNews, [type, id]);
  const tickerMap = peekTickerMap();

  return (
    <List isLoading={isLoading} navigationTitle={`${title} · news`} searchBarPlaceholder="Filter">
      {error ? (
        <ErrorView error={error} title="Could not load news" />
      ) : (
        (data?.data ?? []).map((article, i) => (
          <NewsItem
            key={article.id || article.url || `${article.title}-${i}`}
            article={{ ...article, tickers: tickersFor(article, tickerMap) }}
          />
        ))
      )}
    </List>
  );
}
