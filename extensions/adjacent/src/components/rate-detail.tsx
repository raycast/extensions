import { ActionPanel, Detail } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { getRate, listPrices } from '../lib/api';
import { platformLabel, platformTint, moveTint } from '../lib/brand';
import { renderSeriesChart } from '../lib/chart';
import {
  errorMessage,
  formatLevel,
  formatProb,
  formatSigned,
  formatWeight,
  mdTable,
} from '../lib/format';
import { defaultTimeframe } from '../lib/prefs';
import { ErrorActions } from './actions';
import { RateMoreActions } from './more-actions';

export function RateDetail({ id }: { id: string }) {
  const { data: rate, isLoading, error } = useCachedPromise(getRate, [id]);
  const { data: chart } = useCachedPromise(
    async (rateId: string) => {
      const prices = await listPrices('rate', rateId, defaultTimeframe()).catch(() => ({
        data: [],
      }));
      return renderSeriesChart({
        id: rateId,
        deck: rateId,
        points: prices.data,
        kind: 'percent',
      });
    },
    [id],
  );

  const title = rate?.name || id;
  const sources = mdTable(
    ['Ticker', 'Venue', 'Price', 'Weight'],
    (rate?.sources ?? []).map((source) => [
      source.display_ticker || source.market_id,
      platformLabel(source.platform) ?? source.platform ?? '',
      formatProb(source.latest_price),
      formatWeight(source.weight),
    ]),
  );

  const markdown = error ? errorMessage(error) : [chart ? `![](${chart})` : '', sources].join('\n');

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        rate ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Level" text={formatProb(rate.latest_price)} />
            <Detail.Metadata.TagList title="1D">
              <Detail.Metadata.TagList.Item
                text={formatSigned(rate.price_change_1d)}
                color={moveTint(rate.price_change_1d)}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Spread" text={formatLevel(rate.spread, 1)} />
            <Detail.Metadata.Label title="Method" text={rate.methodology ?? '—'} />
            {(rate.sources ?? []).length ? (
              <Detail.Metadata.TagList title="Sources">
                {(rate.sources ?? []).map((source) => (
                  <Detail.Metadata.TagList.Item
                    key={source.market_id}
                    text={platformLabel(source.platform) ?? source.platform ?? source.market_id}
                    color={platformTint(source.platform)}
                  />
                ))}
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
            <RateMoreActions id={id} title={title} />
          </ActionPanel>
        )
      }
    />
  );
}
