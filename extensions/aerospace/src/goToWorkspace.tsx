import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, popToRoot } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import {
  buildWorkspaceCatalog,
  failureToastOptions,
  focusWorkspace,
  listWindows,
  listWorkspaces,
} from "./utils/aerospace";
import { extractWorkspaceKeys, loadConfig } from "./utils/config";

async function loadWorkspaceCatalog() {
  const [workspaces, windows, config] = await Promise.all([
    listWorkspaces(),
    listWindows("all"),
    loadConfig().catch(() => ({})),
  ]);
  return buildWorkspaceCatalog(workspaces, windows, extractWorkspaceKeys(config));
}

export default function Command() {
  const {
    data: workspaces = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(loadWorkspaceCatalog, [], {
    failureToastOptions: failureToastOptions("Failed to Load Workspaces"),
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces or apps">
      {!isLoading && workspaces.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.AppWindowGrid3x3}
          title={error ? "Failed to Load Workspaces" : "No Workspaces Found"}
          description={
            error ? error.message : "AeroSpace reported no workspaces. Make sure it is running and configured."
          }
          actions={error ? <AeroSpaceRecoveryActions error={error} onRetry={revalidate} /> : undefined}
        />
      )}
      {workspaces.map((workspace) => {
        const appNames = workspace.apps.map((app) => app.name);
        return (
          <List.Item
            key={workspace.name}
            icon={workspace.isFocused ? Icon.Dot : Icon.Desktop}
            title={workspace.name}
            subtitle={appNames.length > 0 ? appNames.join(", ") : "No open apps"}
            keywords={[
              workspace.binding ?? "",
              workspace.monitorName ?? "",
              ...workspace.apps.flatMap((app) => [app.name, app.bundleId]),
            ].filter(Boolean)}
            accessories={[
              ...(workspace.binding ? [{ text: workspace.binding }] : []),
              ...(workspace.isFocused ? [{ tag: "focused" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Go to Workspace"
                  onAction={async () => {
                    try {
                      await focusWorkspace(workspace.name);
                      await popToRoot({ clearSearchBar: true });
                      await closeMainWindow({ clearRootSearch: true });
                    } catch (focusError) {
                      await showFailureToast(focusError, {
                        title: "Could Not Switch Workspace",
                        message: workspace.name,
                      });
                    }
                  }}
                />
                <Action
                  title="Refresh Workspaces"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={async () => {
                    await revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
