import { ActionPanel, Detail, List, Action } from "@raycast/api";
import data from "./result.json";

export default function Command() {
  return (
    <List>
      {data.map((item, index) => (
        <List.Item
          key={item.title + index}
          icon="list-icon.png"
          title={item.title}
          actions={
            <ActionPanel>
              <Action.Push
                title={item.title}
                target={
                  <Detail
                    markdown={item.items
                      .map((item) => {
                        return `${item.content}`;
                      })
                      .join("\n")}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
