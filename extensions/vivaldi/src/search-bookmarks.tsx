import { List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { VivaldiListsItems, NotInstalled, NoBookmarks } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { DEFAULT_ERROR_TITLE, VIVALDI_NO_BOOKMARKS_MESSAGE, VIVALDI_NOT_INSTALLED_MESSAGE } from "./constants";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, data } = useBookmarkSearch(searchText);

  if (error) {
    if (error === VIVALDI_NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    if (VIVALDI_NO_BOOKMARKS_MESSAGE.test(error)) {
      return <NoBookmarks />;
    }
    showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {data?.map((e) => (
        <VivaldiListsItems.TabHistory entry={e} key={e.id} />
      ))}
    </List>
  );
}
