import { Action, ActionPanel, Icon, List, closeMainWindow } from "@raycast/api";
import { loadSpaces, run } from "./spaces";

export default function Command() {
  const spaces = loadSpaces().filter((s) => !s.isFullscreen && !s.isActive);
  return (
    <List searchBarPlaceholder="Send the front window to…">
      {spaces.map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          subtitle={s.note}
          accessories={s.number ? [{ text: `Desktop ${s.number}` }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Move Window"
                icon={Icon.Window}
                onAction={async () => {
                  await closeMainWindow();
                  await run(s.number ? `move-window/${s.number}` : `move-window?name=${encodeURIComponent(s.name)}`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
