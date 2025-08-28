import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { Preferences } from "./interfaces";
import { CometListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data, errorView, isLoading } = useTabSearch(searchText);

  return (
    errorView ?? (
      <List isLoading={isLoading} onSearchTextChange={setSearchText}>
        {data.map((tab) => (
          <CometListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List>
    )
  );
}
