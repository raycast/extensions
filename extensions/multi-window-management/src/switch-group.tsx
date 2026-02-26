import { ActionPanel, Action, List, Icon, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { WindowGroup } from "./types";
import { loadGroups } from "./storage";
import { minimizeAllExcept, restoreWindows, restoreAllWindows } from "./windowManager";

export default function SwitchGroup() {
  const [groups, setGroups] = useState<WindowGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadGroupsList();
  }, []);

  async function loadGroupsList() {
    setIsLoading(true);
    const saved = await loadGroups();
    setGroups(saved);
    setIsLoading(false);
  }

  async function switchToGroup(group: WindowGroup) {
    const toast = await showToast(Toast.Style.Animated, "Switching...", `Activating "${group.name}"`);

    try {
      // Minimize everything except this group's windows
      await minimizeAllExcept(group.windows);

      // Then restore (unminimize) this group's windows
      const result = await restoreWindows(group.windows);

      setActiveGroupId(group.id);

      if (result.shown === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Windows Found";
        toast.message = "None of the windows in this group could be found. They may have been closed.";
      } else if (result.notFound.length > 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Partially Switched";
        toast.message = `${result.shown} window(s) shown, ${result.notFound.length} not found`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Success";
        toast.message = `Now showing ${result.shown} window(s) from "${group.name}"`;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = String(error);
    }
  }

  async function showAllWindows() {
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
    <List isLoading={isLoading} searchBarPlaceholder="Search groups...">
      {groups.length === 0 ? (
        <List.EmptyView
          title="No Window Groups"
          description="Create a window group first using 'Create Window Group' command"
          icon={Icon.Window}
        />
      ) : (
        <>
          <List.Section title="Quick Actions">
            <List.Item
              title="Show All Windows"
              subtitle="Restore all minimized windows"
              icon={{ source: Icon.Eye, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Show All Windows" icon={Icon.Eye} onAction={showAllWindows} />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Window Groups" subtitle={`${groups.length} group(s)`}>
            {groups.map((group) => {
              const isActive = activeGroupId === group.id;
              const uniqueApps = [...new Set(group.windows.map((w) => w.appName))];

              return (
                <List.Item
                  key={group.id}
                  title={group.name}
                  subtitle={`${group.windows.length} window(s) · ${uniqueApps.length} app(s)`}
                  icon={{
                    source: isActive ? Icon.CheckCircle : Icon.AppWindowGrid3x3,
                    tintColor: isActive ? Color.Green : Color.SecondaryText,
                  }}
                  accessories={[
                    { text: uniqueApps.join(", "), icon: Icon.AppWindowGrid2x2 },
                    ...(isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action title="Switch to Group" icon={Icon.ArrowRight} onAction={() => switchToGroup(group)} />
                      <Action
                        title="Show All Windows"
                        icon={Icon.Eye}
                        onAction={showAllWindows}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={loadGroupsList}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
