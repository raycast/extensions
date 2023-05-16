import { useEffect, useState } from 'react';
import { useCachedState, usePromise } from '@raycast/utils';

import { List, Toast, showToast } from '@raycast/api';

import { algoliaIndex, prepareFilters, prepareResults } from './utils';
import { Hit } from './types';
import ProductDropDown from './ProductDropDown';
import Results from './Results';

const Command = () => {
  const [searchText, setSearchText] = useState<string>('');
  const [dropdown, setDropdown] = useCachedState<string>('libs', 'preferences');
  const productFilters = prepareFilters(dropdown);
  const { isLoading, data, error } = usePromise(
    async (filters, query = '') => {
      const results = await algoliaIndex
        .search<Hit>(query, { filters })
        .then((res) => prepareResults(res.hits));

      return results;
    },
    [productFilters, searchText]
  );

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, 'Error', error.message);
  }, [error]);

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<ProductDropDown onChange={setDropdown} />}
    >
      {searchText === '' && (
        <List.EmptyView title="Type to get started" icon="command-small.png" />
      )}
      {searchText && data && <Results data={data} />}
    </List>
  );
};

export default Command;
