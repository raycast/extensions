import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ApiList } from "./api/list";
import { ListObject } from "./types/list";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [list, setList] = useState<ListObject[]>([]);
  const [filteredList, filterList] = useState(list);

  const { isLoading } = ApiList.getAll({
    onData(data) {
      setList(data.list);
    },
  });

  useEffect(() => {
    if (list.length) console.log("item", Object.keys(list[0]));
    if (list.length)
      console.log(
        "type",
        list.map((item) => item.type)
      );
    if (list.length)
      console.log(
        "visualization",
        list.map((item) => item.visualization)
      );
    filterList(
      list.filter((item) => item.type === "list" && item.archivedAt === null && item.name.includes(searchText))
    );
  }, [searchText, list]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Lists"
      searchBarPlaceholder="Search your favorite list"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.id}
          icon={item.name}
          title={item.name}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => console.log(`${item} selected`)} />
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
