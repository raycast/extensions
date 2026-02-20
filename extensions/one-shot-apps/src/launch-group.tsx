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
} from "@raycast/api";
import { useState, useEffect } from "react";
import { open } from "@raycast/api";
import { execFile } from "child_process";
import { AppGroup } from "./types";
import { loadGroups } from "./storage";

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

    for (let i = 0; i < group.apps.length; i++) {
      await open(group.apps[i].path);
      if (delay > 0 && i < group.apps.length - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (group.startShortcut) {
      execFile("shortcuts", ["run", group.startShortcut]);
    }

    await showHUD(`Launched ${group.apps.length} apps`);
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
                <Action title="Launch Group" icon={Icon.Play} onAction={() => launchGroup(group)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
