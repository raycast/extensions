import { List as RayCastList } from '@raycast/api';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { ListItem } from './ListItem';
import { BaseItem } from '../data/fetchList';

interface ListProps {
  data: BaseItem[] | undefined;
  isLoading: boolean;
  onSearch: Dispatch<SetStateAction<string>>;
  search: string;
  showType?: boolean;
}
export const List = ({
  data,
  isLoading,
  onSearch,
  search,
  showType,
}: ListProps) => {
  const content = useMemo(() => {
    if (isLoading || data === undefined) {
      return null;
    }

    if (search === '' && data.length === 0) {
      return (
        <RayCastList.EmptyView title="Type to get started" icon="icon.png" />
      );
    }

    return (
      <>
        {data.map((item) => (
          <ListItem key={item.imdbID} item={item} showType={showType} />
        ))}
      </>
    );
  }, [isLoading, data, search]);

  return (
    <RayCastList
      throttle
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={onSearch}
      searchBarPlaceholder="Search by title..."
    >
      {content}
    </RayCastList>
  );
};
