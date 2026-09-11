import { List } from '@raycast/api';

import { platformLabel, platformTint } from '../lib/brand';
import { displayPrice, formatCompact, formatProb, marketTitle } from '../lib/format';
import type { Market } from '../lib/types';
import { MarketActions } from './entity-actions';

export function MarketItem({ market }: { market: Market }) {
  const price = displayPrice(market);
  const title = marketTitle(market);
  const venue = platformLabel(market.platform);
  const vol = market.volume != null ? formatCompact(market.volume) : null;
  return (
    <List.Item
      id={market.market_id}
      title={title}
      accessories={[
        price.value != null
          ? { text: vol ? `${formatProb(price.value)}  ${vol}` : formatProb(price.value) }
          : {},
        venue ? { tag: { value: venue, color: platformTint(market.platform) } } : {},
      ]}
      actions={<MarketActions id={market.market_id} title={title} venueUrl={market.link} />}
    />
  );
}
