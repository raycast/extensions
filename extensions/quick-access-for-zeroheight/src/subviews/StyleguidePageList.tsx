import { ActionPanel, Action, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

import { StyleguidePage } from "./StyleguidePage";
import { usePageList } from "../hooks/usePageList";

interface StyleguidePageListProps {
  styleguideId: number;
  styleguideName: string;
}

export function StyleguidePageList({ styleguideId, styleguideName }: StyleguidePageListProps) {
  const [sorting, setSorting] = useCachedState("page-list-sorting", "name");

  const { data, isLoading, revalidate } = usePageList(styleguideId);

  const [sortedPages, setSortedPages] = useState(data ?? []);

  useEffect(() => {
    if (!data) return;

    let newSortedPages = data;
    if (sorting === "name") {
      newSortedPages = data.toSorted((a, b) => a.name.localeCompare(b.name));
    } else if (sorting === "created_at") {
      newSortedPages = data.toSorted((a, b) => {
        if (!b.createdAt || !a.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } else if (sorting === "updated_at") {
      newSortedPages = data.toSorted((a, b) => {
        if (!b.updatedAt || !a.updatedAt) return 0;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
    }

    setSortedPages(newSortedPages);
  }, [sorting, data]);

  return (
    <List
      navigationTitle={`${styleguideName ?? "Styleguide"} Pages`}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Order the list of pages"
          onChange={(newSortingMethod) => {
            setSorting(newSortingMethod);
          }}
        >
          <List.Dropdown.Item title="Alphabetical" value="name" />
          <List.Dropdown.Item title="Recently Updated" value="updated_at" />
          <List.Dropdown.Item title="Newest" value="created_at" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      {sortedPages?.map((page) => (
        <List.Item
          key={page.id}
          title={page.name}
          subtitle={page.humanUpdatedAtDate ? `Updated ${page.humanUpdatedAtDate}` : "Never updated"}
          actions={
            <ActionPanel>
              <Action.Push title="View Page" target={<StyleguidePage pageId={page.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
