import { List, showToast, Toast } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { FirefoxListEntries } from "./components";
import { DEFAULT_ERROR_TITLE, NOT_INSTALLED_MESSAGE } from "./constants";
import { NotInstalled } from "./components/NotInstalled";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useHistorySearch(searchText);

  if (error) {
    if (error === NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
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
