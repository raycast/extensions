import { Action, ActionPanel, getApplications, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getAppIcon } from "../utils/apps";
import { AssignedAppOverride, buildAssignedAppItems, getAppIdentifier } from "../utils/app-state";
import { getErrorMessage, parseApps, parseLines, parseRunningApps, runFlashspaceAsync } from "../utils/cli";

export default function UnassignApp() {
  const [overrides, setOverrides] = useState<Record<string, AssignedAppOverride>>({});

  const { isLoading, data, revalidate } = usePromise(
    async () => {
      const [runningAppsOut, workspacesOut, activeWorkspace] = await Promise.all([
        runFlashspaceAsync(["list-running-apps", "--with-bundle-id"]),
        runFlashspaceAsync(["list-workspaces"]),
        runFlashspaceAsync(["get-workspace"]),
      ]);

      const runningApps = parseRunningApps(runningAppsOut);
      const workspaces = parseLines(workspacesOut);
      const assignedWorkspacesByApp: Record<string, string[]> = {};

      const appLists = await Promise.all(
        workspaces.map(async (workspace) => ({
          workspace,
          apps: parseApps(await runFlashspaceAsync(["list-apps", workspace, "--with-bundle-id"])),
        })),
      );

      for (const { workspace, apps } of appLists) {
        for (const app of apps) {
          const identifier = getAppIdentifier(app);
          assignedWorkspacesByApp[identifier] = [...(assignedWorkspacesByApp[identifier] || []), workspace];
        }
      }

      return {
        activeWorkspace: activeWorkspace.trim(),
        assignedWorkspacesByApp,
        runningApps,
      };
    },
    [],
    {
      failureToastOptions: { title: "Failed to list running apps" },
    },
  );

  const { data: installedApps } = usePromise(getApplications);
  const items = useMemo(
    () =>
      buildAssignedAppItems(
        data?.runningApps || [],
        data?.assignedWorkspacesByApp || {},
        overrides,
        data?.activeWorkspace,
      ),
    [data, overrides],
  );

  async function handleUnassign(name: string, bundleId?: string) {
    const identifier = bundleId || name;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Unassigning app..." });

    try {
      await runFlashspaceAsync(["unassign-app", "--name", identifier]);
      toast.style = Toast.Style.Success;
      toast.title = `"${name}" unassigned from all workspaces`;
      setOverrides((current) => ({
        ...current,
        [identifier]: { app: { name, bundleId }, isAssigned: false },
      }));
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to unassign app";
      toast.message = getErrorMessage(error);
    }
  }

  async function handleAssign(name: string, bundleId?: string) {
    const identifier = bundleId || name;
    if (!data?.activeWorkspace) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot assign", message: "No active workspace available" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Assigning app..." });

    try {
      await runFlashspaceAsync(["assign-app", "--name", identifier, "--workspace", data.activeWorkspace]);
      toast.style = Toast.Style.Success;
      toast.title = `"${name}" assigned to "${data.activeWorkspace}"`;
      setOverrides((current) => ({
        ...current,
        [identifier]: { app: { name, bundleId }, isAssigned: true },
      }));
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to assign app";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps to unassign...">
      {items.map((app) => (
        <List.Item
          key={app.identifier}
          title={app.name}
          subtitle={app.bundleId}
          icon={getAppIcon(installedApps, app)}
          accessories={[{ tag: app.isAssigned ? app.assignedWorkspaces.join(", ") || "Assigned" : "Unassigned" }]}
          actions={
            <ActionPanel>
              {app.isAssigned ? (
                <Action
                  title="Unassign App"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => handleUnassign(app.name, app.bundleId)}
                />
              ) : (
                <Action
                  title="Assign App"
                  icon={Icon.PlusCircle}
                  onAction={() => handleAssign(app.name, app.bundleId)}
                />
              )}
              <Action.CopyToClipboard title="Copy App Name" content={app.name} />
              {app.bundleId && <Action.CopyToClipboard title="Copy Bundle ID" content={app.bundleId} />}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setOverrides({});
                  revalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
