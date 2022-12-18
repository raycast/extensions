import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useTabSearch } from "./hooks/useTabSearch";
import { FirefoxListEntries } from "./components";
import { DEFAULT_ERROR_TITLE, NOT_INSTALLED_MESSAGE } from "./constants";
import { NotInstalled } from "./components/NotInstalled";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useTabSearch(searchText);

  if (error) {
    if (error === NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={false}>
      {entries?.map((tab, idx) => (
        <FirefoxListEntries.TabListEntry key={idx} tab={tab} />
      ))}
    </List>
  );
}
