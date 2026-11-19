import { Action, ActionPanel, Color, Icon, List, closeMainWindow } from "@raycast/api";
import { MissingSpacepal } from "./missing-spacepal";
import { loadSpaces, run } from "./spaces";

export default function Command() {
  const spaces = loadSpaces();
  return (
    <List searchBarPlaceholder="Search Spaces, notes and apps">
      {spaces === null && <MissingSpacepal />}
      {(spaces ?? []).map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          subtitle={s.note}
          keywords={[...s.apps, ...(s.note?.split(/\s+/) ?? []), s.number ? String(s.number) : ""]}
          icon={{
            source: Icon.AppWindowGrid2x2,
            tintColor: s.color ?? Color.SecondaryText,
          }}
          accessories={[
            ...(s.isActive ? [{ tag: { value: "Current", color: Color.Green } }] : []),
            { text: s.apps.slice(0, 3).join(", ") },
            ...(s.number ? [{ text: `Desktop ${s.number}` }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Switch to Space"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await closeMainWindow();
                  await run(s.number ? `switch/${s.number}` : `switch?name=${encodeURIComponent(s.name)}`);
                }}
              />
              <Action
                title="Move Front Window Here"
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
