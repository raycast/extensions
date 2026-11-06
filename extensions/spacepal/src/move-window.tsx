import { Action, ActionPanel, Color, Icon, List, closeMainWindow } from "@raycast/api";
import { MissingSpacepal } from "./missing-spacepal";
import { loadSpaces, run } from "./spaces";

export default function Command() {
  const all = loadSpaces();
  const spaces = (all ?? []).filter((s) => !s.isFullscreen && !s.isActive);
  return (
    <List searchBarPlaceholder="Send the front window to…">
      {all === null && <MissingSpacepal />}
      {all !== null && spaces.length === 0 && (
        <List.EmptyView
          icon={Icon.Window}
          title="No other desktop to move to"
          description="Add a desktop in Mission Control, then try again."
        />
      )}
      {spaces.map((s) => (
        <List.Item
          key={s.id}
          icon={{ source: Icon.AppWindowGrid2x2, tintColor: s.color ?? Color.SecondaryText }}
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
