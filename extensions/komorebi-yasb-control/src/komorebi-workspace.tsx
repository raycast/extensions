import { List, ActionPanel, Action, popToRoot, getPreferenceValues } from "@raycast/api";
import { runWithFeedback } from "./utils/run";
import { Preferences, parseWorkspaceCount } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const workspaceCount = parseWorkspaceCount(preferences.workspaceCount);
  const workspaces = Array.from({ length: workspaceCount }, (_, i) => ({
    title: `Workspace ${i}`,
    value: i,
  }));

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
                  await runWithFeedback(
                    "komorebic",
                    ["focus-workspace", ws.value.toString()],
                    `✓ Switched to ${ws.title}`,
                  );
                  await popToRoot();
                }}
              />
              <Action
                title="Move Window to Workspace"
                onAction={async () => {
                  await runWithFeedback(
                    "komorebic",
                    ["move-to-workspace", ws.value.toString()],
                    `✓ Moved window to ${ws.title}`,
                  );
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
