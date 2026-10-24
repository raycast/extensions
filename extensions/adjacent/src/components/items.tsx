import { List } from '@raycast/api';

import { GREEN, MUSTARD, MUTE, platformFromId, platformLabel, platformTint } from '../lib/brand';
import { newsId } from '../lib/api';
import { formatWhen } from '../lib/format';
import type { Event, FindHit, NewsArticle } from '../lib/types';
import { EventActions, IndexActions, MarketActions, RateActions } from './entity-actions';
import { IndexItem, RateItem } from './entity-rows';
import { MarketItem } from './market-row';
import { NewsActions } from './news-actions';

export { MarketItem, IndexItem, RateItem };

export function EventItem({ event }: { event: Event }) {
  return (
    <List.Item
      id={event.event_id}
      title={event.name}
      accessories={[
        event.market_count != null ? { text: `${event.market_count} markets` } : {},
        event.category ? { text: event.category } : {},
      ]}
      actions={<EventActions id={event.event_id} title={event.name} />}
    />
  );
}

export function NewsItem({ article }: { article: NewsArticle }) {
  const id = newsId(article);
  const tickers = article.tickers?.filter(Boolean) ?? [];
  return (
    <List.Item
      id={id}
      title={article.title}
      accessories={[
        tickers.length ? { text: tickers.join(', ') } : {},
        article.source ? { text: article.source } : {},
        article.published_date ? { text: formatWhen(article.published_date) } : {},
      ]}
      actions={<NewsActions id={id} url={article.url} />}
    />
  );
}

function hitTint(hit: FindHit): string {
  if (hit.type === 'index') return GREEN;
  if (hit.type === 'rate') return MUSTARD;
  if (hit.type === 'event' || hit.type === 'news') return MUTE;
  return platformTint(platformFromId(hit.id));
}

function hitKind(hit: FindHit): string {
  if (hit.type === 'index') return 'Index';
  if (hit.type === 'rate') return 'Rate';
  if (hit.type === 'event') return 'Event';
  if (hit.type === 'news') return 'News';
  return platformLabel(platformFromId(hit.id)) ?? 'Market';
}

export function FindHitItem({ hit }: { hit: FindHit }) {
  const tint = hitTint(hit);
  const actions =
    hit.type === 'event' ? (
      <EventActions id={hit.id} title={hit.name} />
    ) : hit.type === 'index' ? (
      <IndexActions id={hit.id} title={hit.name} />
    ) : hit.type === 'rate' ? (
      <RateActions id={hit.id} title={hit.name} />
    ) : hit.type === 'news' ? (
      <NewsActions id={hit.id} url={hit.url} />
    ) : (
      <MarketActions id={hit.id} title={hit.name} />
    );

  return (
    <List.Item
      id={`${hit.type}:${hit.id}`}
      title={hit.name}
      subtitle={hit.subtitle}
      accessories={[
        ...(hit.accessory ? [{ text: hit.accessory }] : []),
        { tag: { value: hitKind(hit), color: tint } },
      ]}
      actions={actions}
    />
  );
}
