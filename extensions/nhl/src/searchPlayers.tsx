import React from "react";
import { Action, ActionPanel, List, LaunchProps } from "@raycast/api";

// Now you can use it in your props type
export default function Command(props: LaunchProps) {
  const { name } = props.arguments;

  console.log(name);

  return (
    <List
      filtering={false}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      <List.Item
        key={'1'}
        title={'testing'}
        actions={
          <ActionPanel>
            <Action title="Select" onAction={() => console.log(`test selected`)} />
          </ActionPanel>
        }
      />
    </List>
  );
}
