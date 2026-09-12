import { ActionPanel, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { getEvent } from '../lib/api';
import { ErrorView } from './empty';
import { EventMoreActions } from './more-actions';
import { MarketItem } from './market-row';

export function EventDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useCachedPromise(getEvent, [id]);
  const title = data?.name || id;

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter">
      {error ? (
        <ErrorView error={error} title="Could not load event" />
      ) : (
        <>
          <List.Section title={title} subtitle={data?.event_id}>
            {(data?.markets ?? []).map((market) => (
              <MarketItem key={market.market_id} market={market} />
            ))}
          </List.Section>
          {data && (data.markets?.length ?? 0) === 0 ? (
            <List.EmptyView
              title="No child markets"
              description={data.description ?? data.category}
              actions={
                <ActionPanel>
                  <EventMoreActions id={id} title={title} />
                </ActionPanel>
              }
            />
          ) : null}
        </>
      )}
    </List>
  );
}
