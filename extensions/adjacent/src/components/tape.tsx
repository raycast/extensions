import { Action, ActionPanel, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { listQuotes, listTrades } from '../lib/api';
import { formatCompact, formatProb, formatWhen, midQuote } from '../lib/format';
import { OpenPreferencesAction } from './actions';
import { ErrorView } from './empty';

export function TradeList({ id, title }: { id: string; title: string }) {
  const { data, isLoading, error } = useCachedPromise(listTrades, [id]);

  return (
    <List isLoading={isLoading} navigationTitle={`${title} · trades`} searchBarPlaceholder="Filter">
      {error ? (
        <ErrorView error={error} title="API key required" />
      ) : (
        (data?.data ?? []).map((trade, index) => (
          <List.Item
            key={`${trade.timestamp ?? 't'}-${index}`}
            title={formatWhen(trade.timestamp)}
            subtitle={formatProb(trade.price)}
            accessories={[
              trade.size != null ? { text: formatCompact(trade.size) } : {},
              trade.side ? { tag: trade.side } : {},
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy ID" content={id} />
                <OpenPreferencesAction />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export function QuoteList({ id, title }: { id: string; title: string }) {
  const { data, isLoading, error } = useCachedPromise(listQuotes, [id]);

  return (
    <List isLoading={isLoading} navigationTitle={`${title} · quotes`} searchBarPlaceholder="Filter">
      {error ? (
        <ErrorView error={error} title="API key required" />
      ) : (
        (data?.data ?? []).map((quote, index) => {
          const mid = quote.mid ?? midQuote(quote.yes_bid, quote.yes_ask);
          return (
            <List.Item
              key={`${quote.timestamp ?? 'q'}-${index}`}
              title={formatWhen(quote.timestamp)}
              subtitle={formatProb(mid)}
              accessories={[
                { text: `${formatProb(quote.yes_bid)} / ${formatProb(quote.yes_ask)}` },
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
