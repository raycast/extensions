import { List } from '@raycast/api';
import { useTrendingCasts } from './hooks';
import { useEffect, useState } from 'react';
import CastListItem from './components/CastListItem';

export default function SearchTrendingCasts() {
  const [query, setQuery] = useState('');
  // const [cursor, setCursor] = useState();
  const { data, isLoading, pagination } = useTrendingCasts();
  const [filteredList, setFilteredList] = useState(data?.casts);

  useEffect(() => {
    setFilteredList(data?.casts.filter((cast) => cast.text.toLowerCase().includes(query.toLowerCase())));
  }, [query, data]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search casts"
      searchBarPlaceholder="Globally search casts across hubs"
      onSearchTextChange={setQuery}
      pagination={pagination}
      throttle
    >
      {filteredList && filteredList.length > 0 ? (
        <List.Section title="Recent Casts" subtitle={`${filteredList.length}`}>
          {filteredList.map((cast) => (
            <CastListItem key={cast.hash} cast={cast} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
