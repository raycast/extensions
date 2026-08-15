import { List, ActionPanel, Action } from "@raycast/api";
import data from "./data.colors.json";

type DataItem = {
  title: string;
  items: {
    title: string;
    description: string;
    documentation: string;
  }[];
};

export default function ColorsCommand() {
  const list: DataItem[] = data;

  return (
    <List isShowingDetail>
      {list.map(({ title: groupTitle, items }) => (
        <List.Section key={groupTitle} title={groupTitle}>
          {items.map(({ title, description, documentation }) => (
            <List.Item
              title={title}
              key={title}
              detail={<List.Item.Detail markdown={description} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={documentation} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
