import { Action, ActionPanel, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';

import { ErrorView } from './components/empty';
import { NewsItem } from './components/items';
import { OpenPreferencesAction } from './components/actions';
import {
  listNews,
  newsTickerMap,
  peekLatestNews,
  peekTickerMap,
  tickersFor,
  warmNews,
} from './lib/api';
import { hasApiKey } from './lib/prefs';
import { site } from './lib/urls';

warmNews();

export default function NewsCommand() {
  const [days, setDays] = useState('7');
  const keyed = hasApiKey();
  const { data: tickerMap } = useCachedPromise(newsTickerMap, [], {
    execute: keyed,
    keepPreviousData: true,
    initialData: peekTickerMap(),
  });
  const { data, isLoading, error, pagination } = useCachedPromise(
    (window: string) => async (options: { page: number }) => {
      const page = await listNews({
        days: Number(window),
        page: options.page + 1,
        per_page: 25,
      });
      return { data: page.data, hasMore: page.meta.has_next };
    },
    [days],
    { execute: keyed, initialData: keyed ? peekLatestNews(Number(days)) : undefined },
  );

  return (
    <List
      isLoading={keyed && isLoading}
      pagination={keyed ? pagination : undefined}
      searchBarPlaceholder="Filter headlines"
      searchBarAccessory={
        <List.Dropdown tooltip="Lookback" value={days} onChange={setDays}>
          <List.Dropdown.Item title="1 day" value="1" />
          <List.Dropdown.Item title="7 days" value="7" />
          <List.Dropdown.Item title="30 days" value="30" />
        </List.Dropdown>
      }
    >
      {!keyed ? (
        <List.EmptyView
          title="API key required"
          description="Paste a key in Preferences."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create API Key" url={site.settingsKeys} />
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : error ? (
        <ErrorView error={error} title="Could not load news" />
      ) : (
        (data ?? []).map((article) => (
          <NewsItem
            key={article.id}
            article={{ ...article, tickers: tickersFor(article, tickerMap) }}
          />
        ))
      )}
    </List>
  );
}
