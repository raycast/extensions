import { List } from "@raycast/api";
import { useState } from "react";
import { useTabSearch } from "./hooks/useTabSearch";
import { TabListItem } from "./components/ChromeTabItems";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, errorView, isLoading } = useTabSearch(searchText);

  return (
    errorView ?? (
      <List isLoading={isLoading} onSearchTextChange={setSearchText}>
        {data.map((tab) => (
          <TabListItem key={tab.key()} tab={tab} useOriginalFavicon={false} />
        ))}
      </List>
    )
  );
}
