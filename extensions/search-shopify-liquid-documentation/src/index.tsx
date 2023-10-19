import { Action, ActionPanel, List } from "@raycast/api";
import { docList } from "./docs";

export default function UserSearchRoot() {
  return (
    <List searchBarPlaceholder="Type to filter the search results" filtering={{ keepSectionOrder: true }} throttle>
      {docList.map((docsItem, k: number) => (
        <List.Section title={docsItem?.section?.sectionTitle} key={k}>
          {docsItem?.section?.items.map((item, key: number) => (
            <List.Item
              key={key}
              title={item.title}
              icon="shopify-icon.png"
              actions={
                <ActionPanel title={item.url}>
                  <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
