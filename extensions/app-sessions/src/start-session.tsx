import {
  List,
  Action,
  ActionPanel,
  Icon,
  showHUD,
  closeMainWindow,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { AppGroup } from "./types";
import { loadGroups } from "./storage";
import { runAppleShortcut } from "./apple-shortcuts";
import { normalizeShortcutValue } from "./shortcut-values";
import { executeRaycastCommandSteps } from "./raycast-commands";

export default function LaunchGroupCommand() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups().then((g) => {
      setGroups(g);
      setIsLoading(false);
    });
  }, []);

  async function launchGroup(group: AppGroup) {
    await closeMainWindow();

    const { launchDelay } = getPreferenceValues<{ launchDelay: string }>();
    const delay = parseInt(launchDelay, 10);
    const failedApps: string[] = [];
    let firstLaunchError: unknown;

    for (let i = 0; i < group.apps.length; i++) {
      try {
        await open(group.apps[i].path);
      } catch (error) {
        firstLaunchError ??= error;
        failedApps.push(group.apps[i].name);
      }

      if (delay > 0 && i < group.apps.length - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    const startShortcut = normalizeShortcutValue(group.startShortcut);

    if (startShortcut) {
      try {
        await runAppleShortcut(startShortcut, (command) =>
          launchCommand({ ...command, type: LaunchType.UserInitiated }),
        );
      } catch (error) {
        await showFailureToast(error, { title: `Could not run "${startShortcut}"` });
        return;
      }
    }

    if (failedApps.length > 0) {
      await showFailureToast(firstLaunchError, { title: `Could not open ${failedApps.join(", ")}` });
      return;
    }

    try {
      await executeRaycastCommandSteps(group.afterStartCommands ?? [], (command) =>
        launchCommand({ ...command, type: LaunchType.UserInitiated }),
      );
    } catch (error) {
      await showFailureToast(error, { title: "Could not run after-start command" });
      return;
    }

    await showHUD(`Started ${group.name}`);
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
                <Action title="Start Session" icon={Icon.Play} onAction={() => launchGroup(group)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
