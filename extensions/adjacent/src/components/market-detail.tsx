import { Action, ActionPanel, Detail } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { getMarket, listPrices } from '../lib/api';
import { platformLabel, platformTint } from '../lib/brand';
import { renderSeriesChart } from '../lib/chart';
import {
  displayPrice,
  errorMessage,
  formatProb,
  formatQty,
  formatWhen,
  marketTitle,
} from '../lib/format';
import { defaultTimeframe, hasApiKey } from '../lib/prefs';
import { ErrorActions } from './actions';
import { MarketMoreActions } from './more-actions';
import { SimilarList } from './similar';

export function MarketDetail({ id }: { id: string }) {
  const { data: market, isLoading, error } = useCachedPromise(getMarket, [id]);
  const { data: chart } = useCachedPromise(
    async (marketId: string) => {
      const prices = await listPrices('market', marketId, defaultTimeframe()).catch(() => ({
        data: [],
      }));
      return renderSeriesChart({
        id: marketId,
        deck: marketId,
        points: prices.data,
        kind: 'percent',
      });
    },
    [id],
  );

  const title = market ? marketTitle(market) : id;
  const shown = market ? displayPrice(market) : { value: null, kind: 'none' as const };
  const venue = platformLabel(market?.platform);

  const markdown = error
    ? errorMessage(error)
    : [chart ? `![](${chart})` : '', market?.rules_primary ? `\n${market.rules_primary}` : ''].join(
        '\n',
      );

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        market ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Mid" text={formatProb(shown.value)} />
            <Detail.Metadata.Label title="Last" text={formatProb(market.probability)} />
            <Detail.Metadata.Label
              title="Bid / Ask"
              text={`${formatProb(market.yes_bid)} / ${formatProb(market.yes_ask)}`}
            />
            <Detail.Metadata.Separator />
            {venue ? (
              <Detail.Metadata.TagList title="Venue">
                <Detail.Metadata.TagList.Item text={venue} color={platformTint(market.platform)} />
              </Detail.Metadata.TagList>
            ) : null}
            <Detail.Metadata.Label
              title="Vol"
              text={formatQty(market.volume, market.volume_unit)}
            />
            <Detail.Metadata.Label
              title="OI"
              text={formatQty(market.open_interest, market.open_interest_unit)}
            />
            <Detail.Metadata.Label title="End" text={formatWhen(market.end_date)} />
            <Detail.Metadata.Label title="Status" text={market.status ?? '—'} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        error ? (
          <ErrorActions error={error} />
        ) : (
          <ActionPanel>
            {hasApiKey() ? (
              <Action.Push title="Similar" target={<SimilarList id={id} title={title} />} />
            ) : null}
            <MarketMoreActions id={id} title={title} venueUrl={market?.link} />
          </ActionPanel>
        )
      }
    />
  );
}
