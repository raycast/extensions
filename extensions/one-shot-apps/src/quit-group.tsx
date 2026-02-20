import { List, Action, ActionPanel, Icon, showHUD, closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import { useState, useEffect } from "react";
import { execFile } from "child_process";
import { AppGroup } from "./types";
import { loadGroups } from "./storage";

export default function QuitGroupCommand() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups().then((g) => {
      setGroups(g);
      setIsLoading(false);
    });
  }, []);

  async function quitGroup(group: AppGroup) {
    await closeMainWindow();

    for (const app of group.apps) {
      const safeName = app.name.replace(/"/g, '\\"');
      execFile("osascript", ["-e", `tell application "${safeName}" to quit`]);
    }

    if (group.quitShortcut) {
      execFile("shortcuts", ["run", group.quitShortcut]);
    }

    await showHUD(`Quit ${group.apps.length} apps`);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search groups...">
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Groups Yet"
          description="Create groups in Manage Groups"
          actions={
            <ActionPanel>
              <Action
                title="Open Manage Groups"
                icon={Icon.Gear}
                onAction={() => launchCommand({ name: "manage-groups", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ) : (
        groups.map((group) => (
          <List.Item
            key={group.id}
            icon={group.icon}
            title={group.name}
            subtitle={group.description}
            accessories={[
              {
                text:
                  group.apps.length > 0 ? `${group.apps.length} app${group.apps.length !== 1 ? "s" : ""}` : "No apps",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Quit Group" icon={Icon.Stop} onAction={() => quitGroup(group)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
