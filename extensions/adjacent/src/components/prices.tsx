import { Action, ActionPanel, Detail } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';

import { listEventMarketPrices, listPrices } from '../lib/api';
import { renderSeriesChart } from '../lib/chart';
import {
  errorMessage,
  formatLevel,
  formatSigned,
  mdTable,
  sortSeries,
  summarizeSeries,
} from '../lib/format';
import { defaultTimeframe, TIMEFRAMES, type Timeframe } from '../lib/prefs';
import type { PriceEntityType } from '../lib/types';
import { ErrorActions, OpenPreferencesAction } from './actions';

export function PriceView({
  type,
  id,
  title,
}: {
  type: PriceEntityType;
  id: string;
  title: string;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe());
  const { data, isLoading, error } = useCachedPromise(
    async (entityType: PriceEntityType, entityId: string, window: Timeframe) => {
      if (entityType === 'event') {
        const rows = await listEventMarketPrices(entityId, window, 10);
        const first = rows.find((row) => row.points.length > 0);
        const chart = first
          ? renderSeriesChart({
              id: `${entityId}:${first.market.market_id}`,
              deck: first.market.display_ticker || first.market.market_id,
              points: first.points,
              kind: 'percent',
            })
          : null;
        return { points: first?.points ?? [], children: rows, chart };
      }
      const page = await listPrices(entityType, entityId, window);
      const chart = renderSeriesChart({
        id: `${entityType}:${entityId}:${window}`,
        deck: title,
        points: page.data,
        kind: entityType === 'index' ? 'level' : 'percent',
      });
      return {
        points: page.data,
        children: [] as Awaited<ReturnType<typeof listEventMarketPrices>>,
        chart,
      };
    },
    [type, id, timeframe],
  );

  const summary = data?.points.length ? summarizeSeries(sortSeries(data.points)) : null;

  const extra =
    type === 'event' && data?.children?.length
      ? mdTable(
          ['Market', 'Close', 'Change'],
          data.children.map((row) => {
            const s = summarizeSeries(sortSeries(row.points));
            return [
              row.market.display_ticker || row.market.market_id,
              s ? formatLevel(s.close) : '—',
              s ? formatSigned(s.change) : '—',
            ];
          }),
        )
      : '';

  const markdown = error
    ? errorMessage(error)
    : [data?.chart ? `![](${data.chart})` : 'No series.', extra].filter(Boolean).join('\n\n');

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Window" text={timeframe} />
          <Detail.Metadata.Label title="Open" text={formatLevel(summary?.open)} />
          <Detail.Metadata.Label title="Close" text={formatLevel(summary?.close)} />
          <Detail.Metadata.Label title="Change" text={formatSigned(summary?.change)} />
        </Detail.Metadata>
      }
      actions={
        error ? (
          <ErrorActions error={error} />
        ) : (
          <ActionPanel>
            <ActionPanel.Submenu title="Price Window">
              {TIMEFRAMES.map((tf) => (
                <Action key={tf} title={tf} onAction={() => setTimeframe(tf)} />
              ))}
            </ActionPanel.Submenu>
            <Action.CopyToClipboard
              title="Copy CSV"
              content={(data?.points ?? []).map((p) => `${p.timestamp},${p.price}`).join('\n')}
            />
            <OpenPreferencesAction />
          </ActionPanel>
        )
      }
    />
  );
}
