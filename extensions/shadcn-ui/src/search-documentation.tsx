import { ActionPanel, List, Action } from "@raycast/api";
import documentation from "./documentation/shadcn-ui-documentation";

export default function SearchDocumentation() {
  return (
    <List searchBarPlaceholder="Search docs...">
      {documentation.map((section) => (
        <List.Section title={section.name} key={section.name}>
          {section.pages.map((item) => (
            <List.Item
              key={item.doc}
              icon="shadcn-icon.png"
              title={item.name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://ui.shadcn.com/docs/${item.path}`} />
                  <Action.CopyToClipboard title="Copy URL" content={`https://ui.shadcn.com/docs/${item.path}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
