import { List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { FirefoxListEntries } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { DEFAULT_ERROR_TITLE, NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "./constants";
import { NotInstalled } from "./components/NotInstalled";
import { NoBookmarks } from "./components/NoBookmarks";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useBookmarkSearch(searchText);

  if (error) {
    if (error === NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    if (NO_BOOKMARKS_MESSAGE.test(error)) {
      return <NoBookmarks />;
    }
    showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={false}>
      {entries?.map((e) => (
        <FirefoxListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List>
  );
}
