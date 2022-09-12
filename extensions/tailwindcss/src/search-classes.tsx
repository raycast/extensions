import { Action, ActionPanel, List } from "@raycast/api";
import classes from "./classes";

export default function SearchClasses() {
  return (
    <List>
      {Object.entries(classes).map(([title, item]) => (
        <List.Section key={title} title={title}>
          {Object.entries(item).map(([className, style]) => (
            <List.Item
              title={className}
              key={className}
              subtitle={style.description}
              accessories={[{ text: style.value }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Class Name"
                    content={className}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Description"
                    content={style.description}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Generated CSS"
                    content={style.value}
                    shortcut={{ modifiers: ["cmd"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
