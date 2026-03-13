import { Action, ActionPanel, environment, List } from "@raycast/api";

import { UTILITY_ITEMS } from "./data";

export default function Command() {
  return (
    <List>
      {UTILITY_ITEMS.map((items) => {
        return (
          <List.Section key={items.section} title={items.section}>
            {items.items.map((item) => (
              <List.Item
                key={item.title + Math.random()}
                icon={
                  environment.appearance === "dark"
                    ? `${items.section.toLowerCase().replace(/\s+/g, "-")}-icon-dark.png`
                    : `${items.section.toLowerCase().replace(/\s+/g, "-")}-icon-light.png`
                }
                title={item.title}
                subtitle={item.subtitle}
                keywords={[items.section]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Utility Value" content={item.content} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
