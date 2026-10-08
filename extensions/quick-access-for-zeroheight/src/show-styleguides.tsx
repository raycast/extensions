import { ActionPanel, Action, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

import { StyleguideListItemData } from "./utils";
import { StyleguidePageList } from "./subviews/StyleguidePageList";
import { useStyleguideList } from "./hooks/useStyleguideList";

export default function Command() {
  const [sorting, setSorting] = useCachedState("styleguide-list-sorting", "name");

  const { data, isLoading, revalidate } = useStyleguideList();
  const [sortedStyleguides, setSortedStyleguides] = useState<StyleguideListItemData[]>([]);

  useEffect(() => {
    if (!data) return;

    let newSortedStyleguides = data;
    if (sorting === "name") {
      newSortedStyleguides = data.toSorted((a, b) => a.name.localeCompare(b.name));
    } else if (sorting === "created_at") {
      newSortedStyleguides = data.toSorted((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    setSortedStyleguides(newSortedStyleguides);
  }, [sorting, data]);

  return (
    <List
      navigationTitle="Styleguides"
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Order the list of styleguides"
          onChange={(newSortingMethod) => {
            setSorting(newSortingMethod);
          }}
        >
          <List.Dropdown.Item title="Alphabetical" value="name" />
          <List.Dropdown.Item title="Newest" value="created_at" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      {sortedStyleguides.map((styleguide) => (
        <List.Item
          key={styleguide.id}
          title={styleguide.name}
          subtitle={`Created ${styleguide.humanCreatedAt}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Styleguide Pages"
                target={<StyleguidePageList styleguideId={styleguide.id} styleguideName={styleguide.name} />}
              />
              <Action.OpenInBrowser url={`https://zeroheight.com/${styleguide.share_id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
