import {
  List,
  ActionPanel,
  Action,
  Icon,
  showHUD,
  showToast,
  Toast,
  LaunchProps,
  closeMainWindow,
  popToRoot,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getGroups, getGroupByName, deleteGroup } from "./utils/storage";
import { raiseWindow } from "./utils/native";
import { Group } from "./utils/types";
import { GroupForm } from "./create-group";

interface Arguments {
  groupName?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  function reload() {
    setGroups(getGroups());
  }

  useEffect(() => {
    reload();
    setIsLoading(false);

    const name = props.arguments.groupName?.trim();
    if (name) {
      const group = getGroupByName(name);
      if (group) {
        handleSummon(group);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `Group "${name}" not found`,
        });
      }
    }
  }, []);

  async function handleSummon(group: Group) {
    try {
      // Raise each group window to front
      for (const win of group.windows) {
        raiseWindow(win.bundleId, win.titleMatch, win.windowId);
      }

      await showHUD(`Summoned "${group.name}"`);
      await closeMainWindow({ clearRootSearch: true });
      await popToRoot({ clearSearchBar: true });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Summon Failed",
        message: String(err),
      });
    }
  }

  async function handleDelete(group: Group) {
    if (
      await confirmAlert({
        title: `Delete "${group.name}"?`,
        message: "This action cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      deleteGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      await showToast({ style: Toast.Style.Success, title: "Group Deleted" });
    }
  }

  return (
    <List isLoading={isLoading}>
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Groups"
          description="Use 'Create Group' to define window groups"
          icon={Icon.Folder}
        />
      ) : (
        groups.map((group) => (
          <List.Item
            key={group.id}
            title={group.name}
            subtitle={
              group.windows.length > 0
                ? group.windows.map((w) => w.appName).join(", ")
                : "No windows configured"
            }
            accessories={group.slot ? [{ tag: `Slot ${group.slot}` }] : []}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Summon Group"
                  icon={Icon.ArrowRight}
                  onAction={() => handleSummon(group)}
                />
                <Action
                  title="Edit Group"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<GroupForm editGroup={group} onSaved={reload} />)
                  }
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Delete Group"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(group)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
