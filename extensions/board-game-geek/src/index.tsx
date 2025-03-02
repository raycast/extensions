import { List } from '@raycast/api';
import { useFetch, showFailureToast } from '@raycast/utils';
import { useState } from 'react';

import ListItem from './components/ListItem';
import { BggSearchResponse } from './models';

import { parseResults } from './utils';

export default function Command() {
  const [searchText, setSearchText] = useState<string>('');

  const { isLoading, data } = useFetch<BggSearchResponse>(
    `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(searchText)}`,
    {
      execute: !!searchText,
      parseResponse: (response: Response) => parseResults(response),
      onError: (error) => {
        console.error(error);
        showFailureToast('Could not fetch games');
      },
      keepPreviousData: true,
    },
  );

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Board Game"
      searchBarPlaceholder="Search for a board game"
      isLoading={isLoading}
      isShowingDetail
    >
      {data && !!searchText ? data.map((item) => <ListItem key={item.bggId} item={item} />) : null}
    </List>
  );
}
