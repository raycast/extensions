import { List } from '@raycast/api';
import { useFetch, showFailureToast } from '@raycast/utils';
import { useState, useMemo } from 'react';

import ListItem from './components/ListItem';
import { BoardGame } from './models';

import { parseResults } from './utils';

export default function Command() {
  const [searchText, setSearchText] = useState<string>('');

  const { isLoading, data } = useFetch(
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

  const resultMemo = useMemo<BoardGame[]>(() => data || [], [data]);

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
      {resultMemo.map((item: BoardGame) => (
        <ListItem key={item.bggId} item={item} />
      ))}
    </List>
  );
}
