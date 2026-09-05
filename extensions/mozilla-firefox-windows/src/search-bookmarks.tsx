import { List, ReactElement } from "@raycast/api";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { HistoryListEntry } from "./components";
import { useState } from "react";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {data?.map((e) => (
        <HistoryListEntry entry={e} key={e.id} />
      ))}
    </List>
  );
}
