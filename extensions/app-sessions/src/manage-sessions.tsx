import { List, Action, ActionPanel, Icon, Alert, confirmAlert, showToast, Toast, Keyboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { AppGroup } from "./types";
import { loadGroups, deleteGroup } from "./storage";
import { EditGroupForm } from "./edit-session";

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
      title: "Delete Session",
      message: `Are you sure you want to delete the "${group.name}" session?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteGroup(group.id);
    await showToast({ style: Toast.Style.Success, title: "Session deleted" });
    await revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Sessions Yet"
          description="Press Enter to create your first session"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Session"
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
            accessories={[
              { text: `${group.apps.length} app${group.apps.length === 1 ? "" : "s"}` },
              ...((group.afterStartCommands?.length ?? 0) + (group.afterEndCommands?.length ?? 0) > 0
                ? [
                    {
                      text: `${(group.afterStartCommands?.length ?? 0) + (group.afterEndCommands?.length ?? 0)} command${(group.afterStartCommands?.length ?? 0) + (group.afterEndCommands?.length ?? 0) === 1 ? "" : "s"}`,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Session"
                  icon={Icon.Pencil}
                  target={<EditGroupForm group={group} revalidate={revalidate} />}
                />
                <Action
                  title="Delete Session"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(group)}
                />
                <Action.Push
                  title="Create New Session"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
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
