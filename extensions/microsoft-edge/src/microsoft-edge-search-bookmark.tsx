import { List, ToastStyle, showToast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { DEFAULT_ERROR_TITLE } from "./common/constants";
import { UrlListItem } from "./components/UrlListItem";
import { useEdgeBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useEdgeBookmarkSearch(searchText);

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
