import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import {
  buildWorkspaceCatalog,
  failureToastOptions,
  balanceWorkspace,
  focusWorkspace,
  listWindows,
  listWorkspaces,
  setWorkspaceRootLayout,
  summonWorkspace,
  TilingLayout,
  WorkspaceCatalogItem,
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

const LAYOUTS: { title: string; value: TilingLayout }[] = [
  { title: "Horizontal Tiles", value: "h_tiles" },
  { title: "Vertical Tiles", value: "v_tiles" },
  { title: "Horizontal Accordion", value: "h_accordion" },
  { title: "Vertical Accordion", value: "v_accordion" },
];

async function runWorkspaceAction(
  title: string,
  workspace: WorkspaceCatalogItem,
  operation: () => Promise<void>,
  onRefresh: () => Promise<unknown>,
) {
  try {
    await operation();
    await showToast({ style: Toast.Style.Success, title, message: `Workspace ${workspace.name}` });
    await onRefresh();
  } catch (error) {
    await showFailureToast(error, { title: `Could Not ${title}`, message: workspace.name });
  }
}

function WorkspaceActions({
  workspace,
  onRefresh,
}: {
  workspace: WorkspaceCatalogItem;
  onRefresh: () => Promise<unknown>;
}) {
  return (
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
      <ActionPanel.Section title="Manage Workspace">
        <Action
          title="Summon to Current Monitor"
          icon={Icon.Download}
          onAction={() =>
            runWorkspaceAction("Summoned Workspace", workspace, () => summonWorkspace(workspace.name), onRefresh)
          }
        />
        <Action
          title="Balance Window Sizes"
          icon={Icon.Ruler}
          onAction={() =>
            runWorkspaceAction("Balanced Window Sizes", workspace, () => balanceWorkspace(workspace.name), onRefresh)
          }
        />
        <ActionPanel.Submenu title="Set Root Layout…" icon={Icon.AppWindowGrid3x3}>
          {LAYOUTS.map((layout) => (
            <Action
              key={layout.value}
              title={layout.title}
              onAction={() =>
                runWorkspaceAction(
                  `Set ${layout.title}`,
                  workspace,
                  () => setWorkspaceRootLayout(workspace.name, layout.value),
                  onRefresh,
                )
              }
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <Action
        title="Refresh Workspaces"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={async () => {
          await onRefresh();
        }}
      />
    </ActionPanel>
  );
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
        const workspaceDetail = [
          workspace.monitorName,
          workspace.rootLayout ? workspace.rootLayout.replace("_", " ") : undefined,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <List.Item
            key={workspace.name}
            icon={workspace.isFocused ? Icon.Dot : workspace.isVisible ? Icon.Desktop : Icon.Circle}
            title={workspace.name}
            subtitle={appNames.length > 0 ? appNames.join(", ") : "No open apps"}
            keywords={[
              workspace.binding ?? "",
              workspace.monitorName ?? "",
              ...workspace.apps.flatMap((app) => [app.name, app.bundleId]),
            ].filter(Boolean)}
            accessories={[
              ...(workspaceDetail ? [{ text: workspaceDetail }] : []),
              ...(workspace.binding ? [{ text: workspace.binding }] : []),
              ...(workspace.isFocused ? [{ tag: "focused" }] : workspace.isVisible ? [{ tag: "visible" }] : []),
            ]}
            actions={<WorkspaceActions workspace={workspace} onRefresh={revalidate} />}
          />
        );
      })}
    </List>
  );
}
