import { Action, ActionPanel, List } from "@raycast/api";
import LatestDocs from "./documentation/latest";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search GitHub CLI Manual...">
      {Object.entries(LatestDocs).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => {
            return (
              <List.Item
                key={item.title + item.url}
                title={item.title}
                subtitle={section}
                icon="icon.png"
                keywords={[item.title, section]}
                actions={
                  <ActionPanel title={item.url}>
                    <Action.OpenInBrowser url={item.url} />
                    <Action.CopyToClipboard content={item.url} title="Copy URL" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      <List.EmptyView
        icon={{ source: { light: "empty-view.png", dark: "empty-view@dark.png" } }}
        title="Whoops! We did not find any matches for your search."
      />
    </List>
  );
}
