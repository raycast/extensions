import { List, Action, ActionPanel, Icon, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { AppGroup } from "./types";
import { loadGroups, deleteGroup } from "./storage";
import { EditGroupForm } from "./edit-group";
import { SelectApps } from "./select-apps";

export default function ManageGroups() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function revalidate() {
    const loaded = await loadGroups();
    setGroups(loaded);
    setIsLoading(false);
  }

  useEffect(() => {
    revalidate();
  }, []);

  async function handleDelete(group: AppGroup) {
    const confirmed = await confirmAlert({
      title: "Delete Group",
      message: `Are you sure you want to delete "${group.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteGroup(group.id);
    await showToast({ style: Toast.Style.Success, title: "Group deleted" });
    await revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search groups...">
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Groups Yet"
          description="Press Enter to create your first group"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Group"
                icon={Icon.Plus}
                target={<EditGroupForm revalidate={revalidate} />}
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
            subtitle={group.description || `${group.apps.length} app${group.apps.length === 1 ? "" : "s"}`}
            accessories={[{ text: `${group.apps.length} app${group.apps.length === 1 ? "" : "s"}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Group"
                  icon={Icon.Pencil}
                  target={<EditGroupForm group={group} revalidate={revalidate} />}
                />
                <Action.Push
                  title="Edit Apps"
                  icon={Icon.AppWindowList}
                  target={<SelectApps group={group} revalidate={revalidate} />}
                />
                <Action
                  title="Delete Group"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(group)}
                />
                <Action.Push
                  title="Create New Group"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<EditGroupForm revalidate={revalidate} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
