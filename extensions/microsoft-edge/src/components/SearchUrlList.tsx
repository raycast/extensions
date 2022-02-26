import { DEFAULT_ERROR_TITLE, EDGE_NOT_INSTALLED_MESSAGE } from "../common/constants";
import { List, showToast, ToastStyle } from "@raycast/api";
import { NotInstalled } from "./NotInstalled";
import { NullableString, UrlSearchResult } from "../schema/types";
import { ReactElement, useState } from "react";
import { UrlListItem } from "./UrlListItem";

export function SearchUrlList(useUrlSearchHook: (query: NullableString) => UrlSearchResult): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useUrlSearchHook(searchText);

  if (error) {
    if (error === EDGE_NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
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
