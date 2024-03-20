import { Action, ActionPanel, List } from "@raycast/api";

import { UTILITY_ITEMS } from "./data";

export default function Command() {
  return (
    <List>
      {UTILITY_ITEMS.map((items) => (
        <List.Section key={items.section} title={items.section}>
          {items.items.map((item) => (
            <List.Item
              key={item.title + Math.random()}
              title={item.title}
              subtitle={item.subtitle}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={item.title} content={item.content} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
