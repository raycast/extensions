import { ActionPanel, Action, Icon, List } from "@raycast/api";
import MIME_MAP from "./mime-map.json";

const ITEMS = Array.from(Array(3).keys()).map((key) => {
  return {
    id: key,
    title: "Title " + key,
    subtitle: "Subtitle",
    accessory: "Accessory",
  };
});

export default function Command() {
  return (
    <List>
      {Object.entries(MIME_MAP).map(([cat, items]) => (
        // <div>

        <List.Section title={cat}>
          {items.map((item) => (
            <List.Item
              key={item.mime}
              icon={Icon.Dot}
              title={item.mime}
              subtitle={item.exts.join(" ")}
              // detail="details"
              accessories={[{ icon: Icon.CopyClipboard, text: "Copy" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={item.mime} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
