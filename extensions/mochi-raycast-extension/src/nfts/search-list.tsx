import { List } from "@raycast/api";
import { useNftTicker } from "../apis";
import SearchItem from "./search-item";
import { useState } from "react";

export default function SearchNFTList() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useNftTicker(searchText);

  const suggestions = data?.suggestions ?? [];
  const isEmpty = searchText && !isLoading && suggestions.length === 0;

  return (
    <List
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
      isShowingDetail={!isEmpty}
      isLoading={isLoading}
    >
      {isEmpty ? (
        <List.EmptyView icon={{ source: "empty.jpg" }} title="Type something to get started" />
      ) : (
        <List.Section title="Search Results">
          {(data?.suggestions ?? []).map((item) => (
            <SearchItem key={item.address} {...item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
