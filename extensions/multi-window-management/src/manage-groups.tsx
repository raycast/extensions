import {
  ActionPanel,
  Action,
  List,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { WindowGroup } from "./types";
import { loadGroups, deleteGroup } from "./storage";
import { minimizeAllExcept, restoreWindows, restoreAllWindows } from "./windowManager";

export default function ManageGroups() {
  const [groups, setGroups] = useState<WindowGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadGroupsData();
  }, []);

  async function loadGroupsData() {
    setIsLoading(true);
    const loadedGroups = await loadGroups();
    setGroups(loadedGroups);
    setIsLoading(false);
  }

  async function handleDeleteGroup(group: WindowGroup) {
    const confirmed = await confirmAlert({
      title: "Delete Group",
      message: `Are you sure you want to delete "${group.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteGroup(group.id);
      if (activeGroupId === group.id) setActiveGroupId(null);
      await showToast(Toast.Style.Success, "Group Deleted", `"${group.name}" has been deleted`);
      await loadGroupsData();
    }
  }

  async function handleSwitchToGroup(group: WindowGroup) {
    const toast = await showToast(Toast.Style.Animated, "Switching to group...");

    try {
      // Minimize everything except this group's windows
      await minimizeAllExcept(group.windows);

      // Then restore (unminimize) this group's windows
      const result = await restoreWindows(group.windows);

      setActiveGroupId(group.id);

      if (result.shown === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Windows Found";
        toast.message = "None of the windows in this group could be found.";
      } else if (result.notFound.length > 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Partially Switched";
        toast.message = `${result.shown} window(s) shown, ${result.notFound.length} not found.`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Switched Successfully";
        toast.message = `Showing ${result.shown} window(s) from "${group.name}"`;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error Switching";
      toast.message = String(error);
    }
  }

  async function handleShowAll() {
    const toast = await showToast(Toast.Style.Animated, "Restoring All Windows...");

    try {
      await restoreAllWindows();
      setActiveGroupId(null);

      toast.style = Toast.Style.Success;
      toast.title = "All Windows Restored";
      toast.message = "All minimized windows have been restored";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search window groups...">
      {groups.length === 0 ? (
        <List.EmptyView
          title="No Window Groups"
          description="Create your first window group to get started"
          icon={Icon.Window}
        />
      ) : (
        groups.map((group) => {
          const isActive = activeGroupId === group.id;
          const uniqueApps = [...new Set(group.windows.map((w) => w.appName))];

          return (
            <List.Item
              key={group.id}
              title={group.name}
              subtitle={`${group.windows.length} window(s)`}
              accessories={[
                { text: uniqueApps.join(", "), icon: Icon.AppWindowGrid2x2 },
                ...(isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []),
                { text: new Date(group.updatedAt).toLocaleDateString() },
              ]}
              icon={isActive ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.AppWindowGrid3x3}
              actions={
                <ActionPanel>
                  <Action title="Switch to Group" icon={Icon.Eye} onAction={() => handleSwitchToGroup(group)} />
                  <Action
                    title="Show All Windows"
                    icon={Icon.AppWindowGrid2x2}
                    onAction={handleShowAll}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  <Action
                    title="View Details"
                    icon={Icon.Info}
                    onAction={() => push(<GroupDetails group={group} onRefresh={loadGroupsData} />)}
                  />
                  <Action
                    title="Delete Group"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteGroup(group)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadGroupsData}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function GroupDetails({ group, onRefresh }: { group: WindowGroup; onRefresh: () => void }) {
  const { pop } = useNavigation();

  async function handleDelete() {
    await deleteGroup(group.id);
    await showToast(Toast.Style.Success, "Group Deleted");
    pop();
    onRefresh();
  }

  return (
    <List navigationTitle={group.name} searchBarPlaceholder="Search windows...">
      <List.Section title="Windows" subtitle={`${group.windows.length} total`}>
        {group.windows.map((window, index) => (
          <List.Item
            key={`${window.appName}-${window.windowTitle}-${index}`}
            title={window.windowTitle}
            subtitle={window.appName}
            icon={Icon.Window}
            accessories={[{ text: window.appName }]}
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Delete This Group"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action title="Delete Group" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleDelete} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
