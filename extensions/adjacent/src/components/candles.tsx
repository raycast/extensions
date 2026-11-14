import { Action, ActionPanel, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { listCandles } from '../lib/api';
import { formatCompact, formatProb, formatWhen, midQuote } from '../lib/format';
import { OpenPreferencesAction } from './actions';
import { ErrorView } from './empty';

export function CandleList({ id, title }: { id: string; title: string }) {
  const { data, isLoading, error } = useCachedPromise(listCandles, [id]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${title} · candles`}
      searchBarPlaceholder="Filter"
    >
      {error ? (
        <ErrorView error={error} title="API key required" />
      ) : (
        (data?.data ?? []).map((candle) => {
          const mid = candle.mid ?? midQuote(candle.yes_bid, candle.yes_ask);
          return (
            <List.Item
              key={candle.timestamp}
              title={formatWhen(candle.timestamp)}
              subtitle={formatProb(mid)}
              accessories={[
                { text: `${formatProb(candle.yes_bid)} / ${formatProb(candle.yes_ask)}` },
                candle.volume != null ? { text: formatCompact(candle.volume) } : {},
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy ID" content={id} />
                  <OpenPreferencesAction />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
