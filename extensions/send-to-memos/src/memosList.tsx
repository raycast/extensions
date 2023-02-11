import { useEffect, useState } from "react";
import { List, ActionPanel, Action, open } from "@raycast/api";
import { getAllMemos, getRequestUrl } from "./api";
import { MemoInfoResponse } from "./types";

export default function MemosListCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = getAllMemos();
  const [filterList, setFilterList] = useState<MemoInfoResponse[]>([]);

  useEffect(() => {
    setFilterList(data?.data?.filter((item) => item.content.includes(searchText)) || []);
  }, [searchText]);

  useEffect(() => {
    setFilterList(data?.data || []);
  }, [data]);

  function openItem(item: MemoInfoResponse) {
    console.log(`${item} selected`);
    const url = getRequestUrl(`/m/${item.id}`);

    open(url);
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Memos"
      searchBarPlaceholder="Search your memo..."
    >
      {filterList.map((item) => (
        <List.Item
          key={item.id}
          title={item.content}
          actions={
            <ActionPanel>
              <Action title="Open web" onAction={() => openItem(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
