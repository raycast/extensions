import { Action, ActionPanel, environment, List } from "@raycast/api";

import { DOCUMENTATION_ITEMS } from "./data";

export default function Command() {
  return (
    <List>
      {DOCUMENTATION_ITEMS.map((items) => (
        <List.Section key={items.section} title={items.section}>
          {items.documents.map((item) => (
            <List.Item
              key={item.page}
              icon={environment.appearance === "dark" ? "hooks-icon-dark.png" : "hooks-icon-light.png"}
              title={item.page}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.href} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
