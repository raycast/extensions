import { ActionPanel, Action, Icon, List } from "@raycast/api";
import MIME_MAP from "./mime-map.json";

export default function Command() {
  return (
    <List>
      {Object.entries(MIME_MAP).map(([cat, items]) => (
        <List.Section key={cat} title={cat}>
          {items.map((item) => (
            <List.Item
              key={item.mime}
              icon={Icon.Dot}
              title={item.mime}
              subtitle={item.exts.join(" ")}
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
