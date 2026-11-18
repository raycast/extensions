import { List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';

import { ErrorView } from './components/empty';
import { FindHitItem } from './components/items';
import { findEntities } from './lib/api';

export default function SearchCommand() {
  const [query, setQuery] = useState('');
  const q = query.trim();

  const { data, isLoading, error } = useCachedPromise(findEntities, [q], {
    execute: q.length > 0,
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Event, market, index, rate"
      searchText={query}
    >
      {error ? (
        <ErrorView error={error} title="Could not load search" />
      ) : q.length === 0 ? (
        <List.EmptyView title="Search Adjacent" description="Type a topic or id." />
      ) : (
        (data ?? []).map((hit) => <FindHitItem key={`${hit.type}:${hit.id}`} hit={hit} />)
      )}
    </List>
  );
}
