import { Action, ActionPanel, List } from "@raycast/api";
import * as iconFile from "./icons.json";

export default function Command() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const icons = iconFile.default as { name: string; svg: string }[];
  return (
    <List>
      {icons.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          icon={`icons/${item.name}.svg`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.svg} shortcut={{ modifiers: ["cmd"], key: "." }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
