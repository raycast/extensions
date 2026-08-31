import { List, Action, ActionPanel, Icon, showHUD, closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { execFile } from "child_process";
import { AppGroup } from "./types";
import { loadGroups } from "./storage";
import { runAppleShortcut } from "./apple-shortcuts";
import { normalizeShortcutValue } from "./shortcut-values";
import { executeRaycastCommandSteps } from "./raycast-commands";

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

    const quitShortcut = normalizeShortcutValue(group.quitShortcut);

    if (quitShortcut) {
      try {
        await runAppleShortcut(quitShortcut, (command) =>
          launchCommand({ ...command, type: LaunchType.UserInitiated }),
        );
      } catch (error) {
        await showFailureToast(error, { title: `Could not run "${quitShortcut}"` });
        return;
      }
    }

    try {
      await executeRaycastCommandSteps(group.afterEndCommands ?? [], (command) =>
        launchCommand({ ...command, type: LaunchType.UserInitiated }),
      );
    } catch (error) {
      await showFailureToast(error, { title: "Could not run after-end command" });
      return;
    }

    await showHUD(`Ended ${group.name}`);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Sessions Yet"
          description="Create a session in Manage Sessions"
          actions={
            <ActionPanel>
              <Action
                title="Open Manage Sessions"
                icon={Icon.Gear}
                onAction={() => launchCommand({ name: "manage-sessions", type: LaunchType.UserInitiated })}
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
                <Action title="End Session" icon={Icon.Stop} onAction={() => quitGroup(group)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
