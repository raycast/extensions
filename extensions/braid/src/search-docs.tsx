import { ActionPanel, Action, List } from "@raycast/api";
import localDocsMap from "./resources/docs-map.json";

export default function Command() {
  return (
    <List filtering={{ keepSectionOrder: true }}>
      {localDocsMap.map(({ section, items }) => (
        <List.Section title={section} key={section} subtitle={`${items.length} Pages`}>
          {items.map(({ name, url }) => (
            <List.Item
              key={name}
              title={name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
