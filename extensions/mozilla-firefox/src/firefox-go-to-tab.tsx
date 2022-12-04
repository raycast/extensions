import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useTabSearch } from "./hooks/useTabSearch";
import { ListEntries } from "./components";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingTabs, error: errorTabs, entries: entriesTabs } = useTabSearch(searchText);

  if (errorTabs) {
    showToast(Toast.Style.Failure, "An Error Occurred", errorTabs.toString());
  }

  return (
    <List
      onSearchTextChange={function (query) {
        setSearchText(query);
      }}
      isLoading={isLoadingTabs}
      throttle={false}
    >
      {(entriesTabs || []).map((tab, idx) => (
        <ListEntries.TabListEntry key={idx} tab={tab} />
      ))}
    </List>
  );
}
