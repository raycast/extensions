import { Action, ActionPanel } from '@raycast/api';

import { hasApiKey } from '../lib/prefs';
import { EventDetail } from './event-detail';
import { IndexDetail } from './index-detail';
import { MarketDetail } from './market-detail';
import {
  EventMoreActions,
  IndexMoreActions,
  MarketMoreActions,
  RateMoreActions,
} from './more-actions';
import { RateDetail } from './rate-detail';
import { SimilarList } from './similar';

export function MarketActions({
  id,
  title,
  venueUrl,
}: {
  id: string;
  title: string;
  venueUrl?: string | null;
}) {
  return (
    <ActionPanel>
      <Action.Push title="Open" target={<MarketDetail id={id} />} />
      {hasApiKey() ? (
        <Action.Push title="Similar" target={<SimilarList id={id} title={title} />} />
      ) : null}
      <MarketMoreActions id={id} title={title} venueUrl={venueUrl} />
    </ActionPanel>
  );
}

export function EventActions({ id, title }: { id: string; title: string }) {
  return (
    <ActionPanel>
      <Action.Push title="Open" target={<EventDetail id={id} />} />
      <EventMoreActions id={id} title={title} />
    </ActionPanel>
  );
}

export function IndexActions({ id, title }: { id: string; title: string }) {
  return (
    <ActionPanel>
      <Action.Push title="Open" target={<IndexDetail id={id} />} />
      <IndexMoreActions id={id} title={title} />
    </ActionPanel>
  );
}

export function RateActions({ id, title }: { id: string; title: string }) {
  return (
    <ActionPanel>
      <Action.Push title="Open" target={<RateDetail id={id} />} />
      <RateMoreActions id={id} title={title} />
    </ActionPanel>
  );
}
