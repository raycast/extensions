import { List } from "@raycast/api";
import { useState } from "react";
import { useTabSearch } from "./hooks/useTabSearch";
import { FirefoxListEntries } from "./components";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useTabSearch(searchText);

  if (errorView) {
    return errorView;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={false}>
      {data?.map((tab, idx) => (
        <FirefoxListEntries.TabListEntry key={idx} tab={tab} />
      ))}
    </List>
  );
}
