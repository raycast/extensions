import { MenuBarExtra, open, openExtensionPreferences } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import { listIndices, peekIndices } from './lib/api';
import { formatIndexQuote } from './lib/format';
import { cycleMs } from './lib/prefs';
import { site } from './lib/urls';
import type { Index } from './lib/types';

function isLive(index: Index): boolean {
  return !index.halted && index.latest_price != null && !Number.isNaN(index.latest_price);
}

function cursor(len: number, rotate: number): number {
  if (len < 1 || rotate <= 0) return 0;
  return Math.floor(Date.now() / rotate) % len;
}

export default function MenuBarCommand() {
  const seed = peekIndices();
  const { data, isLoading } = useCachedPromise(listIndices, [{ per_page: 100 }], {
    initialData: seed.length
      ? {
          data: seed,
          meta: {
            total: seed.length,
            page: 1,
            per_page: 100,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        }
      : undefined,
  });
  const indices = (data?.data ?? []).filter(isLive);
  const current = indices[cursor(indices.length, cycleMs())];

  return (
    <MenuBarExtra isLoading={isLoading} title={current ? formatIndexQuote(current) : 'Adjacent'}>
      {indices.map((index) => (
        <MenuBarExtra.Item
          key={index.index_id}
          title={formatIndexQuote(index)}
          onAction={() => open(site.index(index.index_id))}
        />
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Adjacent" onAction={() => open(site.home)} />
      <MenuBarExtra.Item title="Preferences" onAction={openExtensionPreferences} />
    </MenuBarExtra>
  );
}
