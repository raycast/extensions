import { List } from "@raycast/api";
import { useState } from "react";
import { HistoryListItem } from "./components/HistoryListItem";
import { useSearchHistory } from "./dia";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data, permissionView, revalidate } = useSearchHistory(searchText);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {data?.map((item) => (
        <HistoryListItem key={item.id} item={item} onHistoryAction={revalidate} />
      ))}
    </List>
  );
}
