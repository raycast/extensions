import { ActionPanel, List, Action } from "@raycast/api";
import GetStartedDocs from "./documentation/getStartedDocs";

export default function SearchDocumentation() {
  return (
    <List>
      {Object.entries(GetStartedDocs).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              title={item.title}
              icon="chakra-ui.png"
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
