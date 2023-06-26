import { getPreferenceValues } from '@raycast/api';
import { useState } from 'react';
import { useFetch } from '@raycast/utils';
import { Preferences } from './types';
import { List } from './components';
import { parseResponse } from './utils';

export default function SearchResults() {
  const { token } = getPreferenceValues<Preferences>();
  const [search, setSearch] = useState<string>('');
  const { data, isLoading } = useFetch(
    `https://www.omdbapi.com/?s=${search}&type=movie&apikey=${token}`,
    {
      execute: !!search,
      keepPreviousData: true,
      parseResponse: parseResponse,
    }
  );

  return (
    <List
      data={data}
      isLoading={isLoading}
      onSearch={setSearch}
      search={search}
    />
  );
}
