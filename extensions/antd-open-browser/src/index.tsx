import { List, ActionPanel, Action } from "@raycast/api";
import dataJSON from "./data.json";
import { getComponentUrl } from "./utils";

type dataType = {
  type: string;
  title: string;
  children: { category: string; title: string; type: string; filename: string; subtitle?: string; cover?: string }[];
};
const list: dataType[] = dataJSON;

export default function Command() {
  return (
    <List isShowingDetail>
      {list.map((item) => (
        <List.Section key={item.title} title={item.title}>
          {item.children.map((child) => (
            <List.Item
              title={`${child.title} ${child.subtitle || ""}`}
              key={child.title}
              detail={child.cover && <List.Item.Detail markdown={`![Illustration](${child.cover})`} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={getComponentUrl(child.filename)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
