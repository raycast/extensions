import { ActionPanel, List, Action } from "@raycast/api";
import DOCS = require("./documentation/doc.json");

type docList = {
  [key: string]: {
    url: string;
    title: string;
  }[];
};

export default function Command() {
  const docs: docList = DOCS;

  return (
    <List>
      {Object.entries(docs).map(([section, items]: Array<any>) => (
        <List.Section title={section} key={section}>
          {items.map((item: any) => {
            return (
              <List.Item
                key={item.url}
                title={item.title}
                icon="command-icon.png"
                actions={
                  <ActionPanel title={item.url}>
                    <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                    <Action.CopyToClipboard content={item.url} title="Copy URL" />
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
