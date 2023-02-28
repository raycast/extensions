import { useState } from 'react';
import { List } from '@raycast/api';
import { SearchListItem } from './SearchListItem';
import rambdaFunctionData from '../store/rambdaFunctionData.json';

import type { RambdaFunction } from '../@types';

export const SearchList = () => {
  const [searchText, setSearchText] = useState('');

  const searchResults: RambdaFunction[] = Object.values(rambdaFunctionData).filter(({ functionName }) =>
    new RegExp(searchText, 'ig').test(functionName)
  );

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search Rambda Functions" throttle>
      <List.Section title="Results" subtitle={searchResults?.length + ''}>
        {searchResults?.map((searchResult) => (
          <SearchListItem key={searchResult.functionName} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
};
