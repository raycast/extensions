import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect } from "react";
import { appExists } from "./connector";

const ITEMS = Array.from(Array(3).keys()).map((key) => {
  return {
    id: key,
    title: "Title " + key,
    subtitle: "Subtitle",
    accessory: "Accessory",
  };
});

export default function Command() {
  useEffect(() => {
    if (appExists()) {
      console.log("App exists");
    } else {
      console.log("App does not exist");
    }
  }, []);

  return (
    <List>
      {ITEMS.map((item) => (
        <List.Item
          key={item.id}
          icon="list-icon.png"
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ icon: Icon.Text, text: item.accessory }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
