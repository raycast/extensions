import { Action, ActionPanel, List } from "@raycast/api";
import { docList } from "./docs";

export default function UserSearchRoot() {
  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Type to filter the search results"
      filtering={{ keepSectionOrder: true }}
      throttle
    >
      {docList.map((docsItem, key: number) => (
        <List.Section title={docsItem?.section?.sectionTitle} key={key}>
          {docsItem?.section?.items.map((item, key: number) => (
            <List.Item
              key={key}
              title={item.title}
              keywords={item.keyword}
              icon="shopify-icon.png"
              detail={
                <List.Item.Detail
                  markdown={`${item.description}${
                    item.example
                      ? `

\`\`\`json
${item.example}
\`\`\`
`
                      : ""
                  }`}
                />
              }
              actions={
                <ActionPanel title={item.url}>
                  <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                  {item.example && <Action.CopyToClipboard title="Copy Setting" content={item.example} />}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
