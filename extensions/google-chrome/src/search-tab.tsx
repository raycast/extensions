import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { Preferences } from "./interfaces";
import { ChromeListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data, errorView, isLoading, revalidate } = useTabSearch(searchText);

  return (
    errorView ?? (
      <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search open tabs">
        {data.map((tab) => (
          <ChromeListItems.TabList
            key={tab.key()}
            tab={tab}
            useOriginalFavicon={useOriginalFavicon}
            onTabClosed={revalidate}
          />
        ))}
      </List>
    )
  );
}
