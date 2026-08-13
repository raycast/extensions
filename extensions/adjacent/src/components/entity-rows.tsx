import { List } from '@raycast/api';

import { moveTint } from '../lib/brand';
import {
  formatIndexMove,
  formatLevel,
  formatProb,
  formatSigned,
  indexChangePct,
} from '../lib/format';
import type { Index, Rate } from '../lib/types';
import { IndexActions, RateActions } from './entity-actions';

export function IndexItem({ index }: { index: Index }) {
  const move = formatIndexMove(index);
  return (
    <List.Item
      id={index.index_id}
      title={index.ticker}
      subtitle={index.name}
      accessories={[
        index.latest_price != null ? { text: formatLevel(index.latest_price) } : {},
        move ? { tag: { value: move, color: moveTint(indexChangePct(index)) } } : {},
      ]}
      actions={<IndexActions id={index.index_id} title={index.name} />}
    />
  );
}

export function RateItem({ rate }: { rate: Rate }) {
  return (
    <List.Item
      id={rate.rate_id}
      title={rate.name}
      accessories={[
        rate.latest_price != null ? { text: formatProb(rate.latest_price) } : {},
        rate.price_change_1d != null
          ? {
              tag: {
                value: `(${formatSigned(rate.price_change_1d)})`,
                color: moveTint(rate.price_change_1d),
              },
            }
          : {},
      ]}
      actions={<RateActions id={rate.rate_id} title={rate.name} />}
    />
  );
}
