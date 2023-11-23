import { List as RayCastList } from '@raycast/api';
import { Fragment } from 'react';
import { ListProps } from '../types';
import ListItem from './ListItem';

const List = ({ data, isLoading, onSearch, search }: ListProps) => {
  return (
    <RayCastList
      throttle
      isLoading={isLoading}
      onSearchTextChange={onSearch}
      searchBarPlaceholder="Search by title..."
    >
      {search === '' && (
        <RayCastList.EmptyView
          title="Type to get started"
          icon="popcorn-small.png"
        />
      )}
      {!isLoading && !!data ? (
        <Fragment>
          {data.map((item) => (
            <ListItem key={item.imdbID} item={item} />
          ))}
        </Fragment>
      ) : null}
    </RayCastList>
  );
};

export default List;
