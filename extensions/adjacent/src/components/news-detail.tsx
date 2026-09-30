import { Action, ActionPanel, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import {
  getNews,
  listNewsMarkets,
  peekIndices,
  peekRates,
  peekTickerMap,
  tickersFor,
} from '../lib/api';
import { formatWhen } from '../lib/format';
import { OpenPreferencesAction } from './actions';
import { ErrorView } from './empty';
import { IndexItem, RateItem } from './entity-rows';
import { MarketItem } from './market-row';

export function NewsDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useCachedPromise(
    async (articleId: string) => {
      const [article, markets] = await Promise.all([
        getNews(articleId),
        listNewsMarkets(articleId).catch(() => ({ data: [] })),
      ]);
      const marketIds = new Set(markets.data.map((m) => m.market_id));
      const matched = new Set(tickersFor(article, peekTickerMap()));
      return {
        article,
        markets: markets.data,
        indices: peekIndices().filter((index) => matched.has(index.ticker)),
        rates: peekRates().filter((rate) =>
          rate.sources?.some((source) => marketIds.has(source.market_id)),
        ),
      };
    },
    [id],
  );

  const article = data?.article;
  const title = article?.title || id;
  const markets = data?.markets ?? [];
  const indices = data?.indices ?? [];
  const rates = data?.rates ?? [];
  const empty = !isLoading && !error && markets.length + indices.length + rates.length === 0;

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter">
      {error ? (
        <ErrorView error={error} title="Could not load article" />
      ) : empty ? (
        <List.EmptyView
          title="No related markets"
          description={article?.url ?? 'Not linked to a market, index, or rate.'}
          actions={
            <ActionPanel>
              {article?.url ? <Action.OpenInBrowser title="Source" url={article.url} /> : null}
              <Action.CopyToClipboard title="Copy Headline" content={title} />
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {indices.length ? (
            <List.Section title="Indices">
              {indices.map((index) => (
                <IndexItem key={index.index_id} index={index} />
              ))}
            </List.Section>
          ) : null}
          {rates.length ? (
            <List.Section title="Rates">
              {rates.map((rate) => (
                <RateItem key={rate.rate_id} rate={rate} />
              ))}
            </List.Section>
          ) : null}
          {markets.length ? (
            <List.Section
              title="Markets"
              subtitle={[article?.source, formatWhen(article?.published_date)]
                .filter(Boolean)
                .join(' · ')}
            >
              {markets.map((market) => (
                <MarketItem key={market.market_id} market={market} />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}
