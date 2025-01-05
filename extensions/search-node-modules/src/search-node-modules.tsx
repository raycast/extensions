import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";

import { Items, OrderBy } from "./types";
import { formatSize } from "./format";
import { handleDelete, handleDeleteAll } from "./delete";
import { search } from "./search";

export default function SearchNodeModules() {
  const [items, setItems] = useState<Items[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [sortWith, setSortWith] = useState<OrderBy>("size");

  const filteredItems = useMemo(() => items.filter((item) => !deletedItems.has(item.id)), [items, deletedItems]);
  const paths = useMemo(() => filteredItems.map((item) => item.id), [filteredItems]);

  const sortedItems = useMemo(() => {
    if (sortWith === "size") return filteredItems.sort((a, b) => b.size - a.size);
    if (sortWith === "newest") return filteredItems.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    if (sortWith === "oldest") return filteredItems.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
    return filteredItems;
  }, [filteredItems, deletedItems, sortWith]);

  useEffect(() => {
    console.debug("Searching node_modules folders");
    search(setItems, setLoading);
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip={"Order By"} onChange={(value) => setSortWith(value as OrderBy)} defaultValue="size">
          <List.Dropdown.Item title="Size" value="size" />
          <List.Dropdown.Item title="Newest" value="newest" />
          <List.Dropdown.Item title="Oldest" value="oldest" />
        </List.Dropdown>
      }
    >
      {sortedItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          accessories={[
            {
              text: formatSize(item.size),
            },
            {
              tag: item.lastModified,
            },
          ]}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(item.id, setDeletedItems)}
              />
              <Action
                title="Delete All"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteAll(paths, setItems, setDeletedItems)}
              />
              <Action.ShowInFinder path={item.id} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
