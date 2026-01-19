import { List, ActionPanel, Action, showHUD, popToRoot } from "@raycast/api";
import { run } from "./utils/run";

const workspaces = Array.from({ length: 10 }, (_, i) => ({
  title: `Workspace ${i}`,
  value: i,
}));

export default function Command() {
  return (
    <List navigationTitle="Switch Workspace">
      {workspaces.map((ws) => (
        <List.Item
          key={ws.value}
          title={ws.title}
          actions={
            <ActionPanel>
              <Action
                title="Switch to Workspace"
                onAction={async () => {
                  run("komorebic", ["focus-workspace", ws.value.toString()]);
                  await showHUD(`Switched to ${ws.title}`);
                  await popToRoot();
                }}
              />
              <Action
                title="Move Window to Workspace"
                onAction={async () => {
                  run("komorebic", ["move-to-workspace", ws.value.toString()]);
                  await showHUD(`Moved window to ${ws.title}`);
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
