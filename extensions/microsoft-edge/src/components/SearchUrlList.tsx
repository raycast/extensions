import { DEFAULT_ERROR_TITLE } from '../common/constants';
import { List, showToast, ToastStyle } from '@raycast/api';
import { NullableString, UrlSearchResult } from '../schema/types';
import { ReactElement, useState } from 'react';
import { UrlListItem } from './UrlListItem';

export function SearchUrlList(useUrlSearchHook: (query: NullableString) => UrlSearchResult): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useUrlSearchHook(searchText);

  if (error) {
    showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {entries?.map((bookmarkEntry) => (
        <UrlListItem entry={bookmarkEntry} key={bookmarkEntry.id} />
      ))}
    </List>
  );
}
