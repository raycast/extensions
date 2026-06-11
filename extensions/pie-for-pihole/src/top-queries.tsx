import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";
import { AddToListAction } from "./utils";

export default function TopQueries() {
  const [count, setCount] = useState("25");

  const { isLoading, data, revalidate } = useCachedPromise((n) => getPiholeAPI().getTopQueries(parseInt(n)), [count]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Top Queries"
      searchBarPlaceholder="Search for domains"
      searchBarAccessory={
        <List.Dropdown tooltip="Number of Results" value={count} onChange={setCount}>
          <List.Dropdown.Item title="Top 25" value="25" />
          <List.Dropdown.Item title="Top 50" value="50" />
          <List.Dropdown.Item title="Top 100" value="100" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No query data available" />
      <List.Section title="Top Allowed Queries">
        {data?.topAllowed.map((item) => (
          <List.Item
            key={item.domainURL}
            title={item.domainURL}
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            accessories={[{ text: item.blockCount }]}
            actions={
              <ActionPanel title="Actions">
                <AddToListAction domain={item.domainURL} listType="black" />
                <Action.CopyToClipboard content={item.domainURL} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Top Blocked Queries">
        {data?.topBlocked.map((item) => (
          <List.Item
            key={item.domainURL}
            title={item.domainURL}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            accessories={[{ text: item.blockCount }]}
            actions={
              <ActionPanel title="Actions">
                <AddToListAction domain={item.domainURL} listType="white" />
                <Action.CopyToClipboard content={item.domainURL} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
