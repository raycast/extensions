import { DEFAULT_ERROR_TITLE, EDGE_NOT_INSTALLED_MESSAGE } from "./common/constants";
import { List, showToast, ToastStyle } from "@raycast/api";
import { NotInstalled } from "./components/NotInstalled";
import { ReactElement, useState } from "react";
import { UrlListItem } from "./components/UrlListItem";
import { useEdgeBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useEdgeBookmarkSearch(searchText);

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
