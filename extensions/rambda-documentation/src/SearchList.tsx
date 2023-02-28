import { useState } from 'react';
import { List } from '@raycast/api';
import { SearchListItem } from './SearchListItem';
import { useRambdaDocumentation } from './hooks/useRambdaDocumentation';

import type { RambdaFunction } from '../@types';

export const SearchList = () => {
  const [searchText, setSearchText] = useState('');
  const { data, isLoading } = useRambdaDocumentation();

  const searchResults: RambdaFunction[] = data
    ? Object.values(data).filter(({ functionName }) => new RegExp(searchText, 'ig').test(functionName))
    : [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Rambda Functions"
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
