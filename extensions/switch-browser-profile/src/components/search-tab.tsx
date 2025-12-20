import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { Preferences } from "../interfaces";
import { useTabSearch } from "../hooks/useTabSearch";
import { ChromeListItems } from "./chrome-list-items";

export default function SearchTab() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data, errorView, isLoading } = useTabSearch(searchText);

  return (
    errorView ?? (
      <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search across all open tabs">
        {data.map((tab) => (
          <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List>
    )
  );
}
