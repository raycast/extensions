import { Action, ActionPanel, List } from "@raycast/api";
import { useDoc } from "./useDoc";

export default function UserSearchRoot() {
  const { result } = useDoc();

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Type to filter the search results"
      filtering={{ keepSectionOrder: true }}
      throttle
    >
      {result.sections.map((docsItem, key: number) => (
        <List.Section title={docsItem.sectionTitle} key={key}>
          {docsItem.items.map((item, key: number) => {
            const previewImage = item.previewImg ? `![Preview Image](${item.previewImg})` : "";

            return (
              <List.Item
                key={key}
                title={item.title}
                keywords={item.keywords}
                icon="shopify-icon.png"
                detail={
                  <List.Item.Detail
                    markdown={
                      "## " + item.title + "\n" + previewImage + "\n" + item.shortDescription + "\n" + item.content
                    }
                  />
                }
                actions={
                  <ActionPanel title={item.path}>
                    <Action.OpenInBrowser url={item.path} title="Open in Browser" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
