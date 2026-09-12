import { Action, ActionPanel, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { listSimilar } from '../lib/api';
import { platformLabel, platformTint } from '../lib/brand';
import { formatProb } from '../lib/format';
import { ErrorView } from './empty';
import { MarketDetail } from './market-detail';
import { MarketMoreActions } from './more-actions';

export function SimilarList({ id, title }: { id: string; title: string }) {
  const { data, isLoading, error } = useCachedPromise(listSimilar, [id]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${title} · similar`}
      searchBarPlaceholder="Filter"
    >
      {error ? (
        <ErrorView error={error} title="API key required" />
      ) : (
        (data?.data ?? []).map((hit) => {
          const venue = platformLabel(hit.platform);
          const name = hit.question || hit.market_id;
          return (
            <List.Item
              key={hit.market_id}
              title={name}
              accessories={[
                { text: `${(hit.similarity * 100).toFixed(0)}%` },
                hit.latest_price != null ? { text: formatProb(hit.latest_price) } : {},
                venue ? { tag: { value: venue, color: platformTint(hit.platform) } } : {},
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<MarketDetail id={hit.market_id} />} />
                  <MarketMoreActions id={hit.market_id} title={name} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
