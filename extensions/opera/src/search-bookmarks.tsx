import { List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { NoBookmarks, NotInstalled, OperaListsItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { DEFAULT_ERROR_TITLE, OPERA_NO_BOOKMARKS_MESSAGE, OPERA_NOT_INSTALLED_MESSAGE } from "./constants";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, data } = useBookmarkSearch(searchText);

  if (error) {
    if (error === OPERA_NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    if (OPERA_NO_BOOKMARKS_MESSAGE.test(error)) {
      return <NoBookmarks />;
    }
    showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {data?.map((e) => (
        <OperaListsItems.TabHistory entry={e} key={e.id} />
      ))}
    </List>
  );
}
