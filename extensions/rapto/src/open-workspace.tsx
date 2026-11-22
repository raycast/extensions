import { Action, ActionPanel, closeMainWindow, Icon, List, PopToRootType, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { RaptoErrorView } from "./components";
import { listWorkspaces, openWorkspace } from "./rapto";

export default function OpenWorkspace() {
  const {
    data: workspaces,
    isLoading,
    error,
    revalidate,
  } = usePromise(listWorkspaces, [], { onError: () => undefined });

  if (error) {
    return (
      <List>
        <RaptoErrorView error={error} onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces">
      <List.EmptyView
        icon={Icon.Layers}
        title="No workspaces yet"
        description="Arrange the apps of a desktop, then right-click it in the desktops bar and choose Save as Workspace."
      />
      {workspaces?.map((workspace) => (
        <List.Item
          key={workspace.id}
          icon={Icon.Layers}
          title={workspace.name}
          subtitle={workspace.apps.join(", ")}
          keywords={workspace.apps}
          accessories={workspace.displays > 1 ? [{ text: `${workspace.displays} displays` }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Open Workspace"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                  if (!(await openWorkspace(workspace.id))) {
                    await showToast({ style: Toast.Style.Failure, title: "That workspace no longer exists" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
