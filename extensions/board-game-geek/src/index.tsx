import { List, showToast, Toast } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useState } from 'react';

import ListItem from './components/ListItem';
import { BggSearchResponse } from './models';
import useHistory from './useHistory';
import { parseResults } from './utils';

export default function Command() {
  const [searchText, setSearchText] = useState<string>('');

  const { history } = useHistory();

  const { isLoading, data } = useFetch<BggSearchResponse>(
    `https://boardgamegeek.com/xmlapi2/search?query=${searchText}`,
    {
      execute: !!searchText,
      parseResponse: (response: Response) => parseResults(response),
      onError: (error) => {
        console.error(error);
        showToast(Toast.Style.Failure, 'Could not fetch games');
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
    >
      {data && !!searchText ? (
        data?.map((item) => <ListItem key={item.bggId} item={item} />)
      ) : (
        <List.Section title="Recent">{history?.map((item) => <ListItem key={item.bggId} item={item} />)}</List.Section>
      )}
    </List>
  );
}
