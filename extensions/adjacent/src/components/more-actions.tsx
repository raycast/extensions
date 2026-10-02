import { Action, Keyboard } from '@raycast/api';

import { hasApiKey } from '../lib/prefs';
import { site } from '../lib/urls';
import { OpenPreferencesAction } from './actions';
import { CandleList } from './candles';
import { PriceView } from './prices';
import { RelatedNewsList } from './related-news';
import { QuoteList, TradeList } from './tape';

function IdAndPrefs({ id }: { id: string }) {
  return (
    <>
      <Action.CopyToClipboard
        title="Copy ID"
        content={id}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <OpenPreferencesAction />
    </>
  );
}

export function MarketMoreActions({
  id,
  title,
  venueUrl,
}: {
  id: string;
  title: string;
  venueUrl?: string | null;
}) {
  return (
    <>
      <Action.Push title="Prices" target={<PriceView type="market" id={id} title={title} />} />
      {hasApiKey() ? (
        <>
          <Action.Push title="Candles" target={<CandleList id={id} title={title} />} />
          <Action.Push
            title="News"
            target={<RelatedNewsList type="market" id={id} title={title} />}
          />
          <Action.Push title="Trades" target={<TradeList id={id} title={title} />} />
          <Action.Push title="Quotes" target={<QuoteList id={id} title={title} />} />
        </>
      ) : null}
      {venueUrl ? <Action.OpenInBrowser title="Venue" url={venueUrl} /> : null}
      <IdAndPrefs id={id} />
    </>
  );
}

export function EventMoreActions({ id, title }: { id: string; title: string }) {
  return (
    <>
      <Action.Push title="Prices" target={<PriceView type="event" id={id} title={title} />} />
      <IdAndPrefs id={id} />
    </>
  );
}

export function IndexMoreActions({ id, title }: { id: string; title: string }) {
  return (
    <>
      <Action.Push title="Prices" target={<PriceView type="index" id={id} title={title} />} />
      {hasApiKey() ? (
        <Action.Push title="News" target={<RelatedNewsList type="index" id={id} title={title} />} />
      ) : null}
      <Action.OpenInBrowser title="Adjacent" url={site.index(id)} />
      <IdAndPrefs id={id} />
    </>
  );
}

export function RateMoreActions({ id, title }: { id: string; title: string }) {
  return (
    <>
      <Action.Push title="Prices" target={<PriceView type="rate" id={id} title={title} />} />
      {hasApiKey() ? (
        <Action.Push title="News" target={<RelatedNewsList type="rate" id={id} title={title} />} />
      ) : null}
      <IdAndPrefs id={id} />
    </>
  );
}
