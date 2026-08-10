import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useMemo } from "react";

export default function SearchDocumentation() {
  const documentation: docList = useMemo(() => {
    return require("./documentation/latest.json");
  }, []);

  return (
    <List>
      {Object.entries(documentation).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.title + item.url}
              icon="serverless-doc.png"
              title={item.title}
              subtitle={item.subtitle}
              keywords={[item.title, item.subtitle, section]}
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

type docList = {
  [key: string]: docItem[];
};

interface docItem {
  title: string;
  subtitle: string;
  url: string;
}
