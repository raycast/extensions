import { List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';

import { ErrorView } from './components/empty';
import { FindHitItem } from './components/items';
import { findEntities, listCatalog, peekCatalog, warmCatalog } from './lib/api';

warmCatalog();

export default function BrowseCommand() {
  const [search, setSearch] = useState('');
  const query = search.trim();

  const { data, isLoading, error } = useCachedPromise(
    async (q: string) => (q ? findEntities(q, undefined, 15) : listCatalog()),
    [query],
    { keepPreviousData: true, initialData: query ? undefined : peekCatalog() },
  );

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Event, market, index, rate"
    >
      {error ? (
        <ErrorView error={error} title="Could not load browse" />
      ) : (
        (data ?? []).map((hit) => <FindHitItem key={`${hit.type}:${hit.id}`} hit={hit} />)
      )}
    </List>
  );
}
