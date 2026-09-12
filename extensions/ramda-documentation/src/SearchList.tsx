import { useState } from 'react';
import { List } from '@raycast/api';
import { SearchListItem } from './SearchListItem';
import { useRamdaDocumentation } from './hooks/useRamdaDocumentation';

import type { RamdaFunction } from '../@types';

export const SearchList = () => {
  const [searchText, setSearchText] = useState('');
  const { data, isLoading } = useRamdaDocumentation();

  const searchResults: RamdaFunction[] = data
    ? Object.values(data).filter(({ functionName }) => new RegExp(searchText, 'ig').test(functionName))
    : [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Ramda Functions"
      throttle
    >
      <List.Section title="Results" subtitle={searchResults?.length + ''}>
        {searchResults?.map((searchResult) => (
          <SearchListItem key={searchResult.functionName} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
};
