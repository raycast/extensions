import { ActionPanel, Detail } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { getIndex, listIndexConstituents, listPrices } from '../lib/api';
import { TREND_DOWN, moveTint, platformLabel } from '../lib/brand';
import { renderSeriesChart } from '../lib/chart';
import {
  constituentPrice,
  errorMessage,
  formatIndexMove,
  formatLevel,
  formatProb,
  formatSigned,
  formatWeight,
  indexChangePct,
  mdTable,
} from '../lib/format';
import { defaultTimeframe } from '../lib/prefs';
import { ErrorActions } from './actions';
import { IndexMoreActions } from './more-actions';

export function IndexDetail({ id }: { id: string }) {
  const { data: index, isLoading, error } = useCachedPromise(getIndex, [id]);
  const { data: extras } = useCachedPromise(
    async (indexId: string, hasLegs: boolean) => {
      const [constituents, prices] = await Promise.all([
        hasLegs
          ? Promise.resolve([])
          : listIndexConstituents(indexId)
              .then((page) => page.data)
              .catch(() => []),
        listPrices('index', indexId, defaultTimeframe())
          .then((page) => page.data)
          .catch(() => []),
      ]);
      return {
        constituents,
        chart: renderSeriesChart({
          id: indexId,
          deck: indexId,
          points: prices,
          kind: 'level',
        }),
      };
    },
    [id, Boolean(index?.constituents?.length)],
    { execute: index != null },
  );

  const title = index?.name || id;
  const change = index ? formatIndexMove(index) : null;
  const rows = index?.constituents?.length ? index.constituents : (extras?.constituents ?? []);
  const legs = mdTable(
    ['Ticker', 'Name', 'Venue', 'Price', 'Weight'],
    rows.map((c) => {
      const px = constituentPrice(c);
      return [
        c.display_ticker || c.ticker || c.market_id || '',
        c.question || c.name || '',
        platformLabel(c.platform) ?? c.platform ?? '',
        px != null ? formatProb(px) : '',
        formatWeight(c.weight),
      ];
    }),
  );

  const markdown = error
    ? errorMessage(error)
    : [extras?.chart ? `![](${extras.chart})` : '', legs ? `\n${legs}` : ''].join('\n');

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        index ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Level" text={formatLevel(index.latest_price)} />
            <Detail.Metadata.TagList title="1D">
              <Detail.Metadata.TagList.Item
                text={change ?? '—'}
                color={moveTint(indexChangePct(index))}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="7D"
              text={formatSigned(index.price_change_7d ?? index.change_7d)}
            />
            <Detail.Metadata.Label title="Method" text={index.methodology ?? '—'} />
            <Detail.Metadata.Label
              title="Count"
              text={String(index.constituents_count ?? rows.length)}
            />
            {index.halted ? (
              <Detail.Metadata.TagList title="Halt">
                <Detail.Metadata.TagList.Item text="halted" color={TREND_DOWN} />
              </Detail.Metadata.TagList>
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        error ? (
          <ErrorActions error={error} />
        ) : (
          <ActionPanel>
            <IndexMoreActions id={id} title={title} />
          </ActionPanel>
        )
      }
    />
  );
}
