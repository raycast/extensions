import { List, Toast, showToast } from '@raycast/api';
import { useCachedState, usePromise } from '@raycast/utils';
import { useEffect, useState } from 'react';

import ProductDropDown from './ProductDropDown';
import Results from './Results';
import { Hit } from './types';
import { algoliaIndex, prepareFilters, prepareResults } from './utils';

const Command = () => {
  const [searchText, setSearchText] = useState<string>('');
  const [dropdown, setDropdown] = useCachedState<string>('libs', 'preferences');
  const productFilters = prepareFilters(dropdown);
  const { data, error, isLoading } = usePromise(
    async (filters, query = '') => {
      const results = await algoliaIndex
        .search<Hit>(query, { filters })
        .then((res) => prepareResults(res.hits));

      return results;
    },
    [productFilters, searchText],
  );

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, 'Error', error.message);
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<ProductDropDown onChange={setDropdown} />}
      throttle
    >
      {searchText === '' && (
        <List.EmptyView icon="command-small.png" title="Type to get started" />
      )}
      {searchText && data && <Results data={data} />}
    </List>
  );
};

export default Command;
