import { DocList } from "./index";
import { Action, ActionPanel, List } from "@raycast/api";

export function DocumentationList(props: { docs: DocList[] }) {
  return (
    <>
      {props.docs.map((doc: DocList, k: number) => (
        <List.Section title={doc.section.title} key={k}>
          {doc.section.items.map((item, key: number) => (
            <List.Item
              key={key}
              title={item.title}
              icon="vue-icon.png"
              actions={
                <ActionPanel title={item.url}>
                  <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                  <Action.CopyToClipboard content={item.url} title="Copy URL" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </>
  );
}
