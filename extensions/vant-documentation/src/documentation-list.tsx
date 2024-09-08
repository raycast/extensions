import { List, ActionPanel, Action } from "@raycast/api";

import type { Doc } from "./type";

interface Props {
  doc: Doc[];
}

export function DocumentationList(props: Props) {
  return (
    <>
      {props.doc.map((item, key) => (
        <List.Section key={key} title={item.title}>
          {item.items.map((item, key) => (
            <List.Item
              key={key}
              icon="vant-icon.png"
              title={item.title}
              subtitle={item.subTitle}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url}></Action.OpenInBrowser>
                  <Action.CopyToClipboard content={item.title} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </>
  );
}
