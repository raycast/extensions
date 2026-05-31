import { Action, ActionPanel, Icon, List, closeMainWindow } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listWorkspaces, selectWorkspace, Workspace } from "./cmux";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(listWorkspaces, [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Failed to load workspaces" });
    },
  });

  async function goTo(ws: Workspace) {
    try {
      await selectWorkspace(ws.ref);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to switch workspace" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter workspaces…">
      {(data ?? []).map((ws) => (
        <List.Item
          key={ws.ref}
          title={ws.title}
          subtitle={ws.currentDirectory ?? undefined}
          icon={ws.selected ? Icon.CheckCircle : Icon.Circle}
          accessories={[
            ...(ws.pinned ? [{ icon: Icon.Tack, tooltip: "Pinned" }] : []),
            ...(ws.selected ? [{ tag: "current" }] : []),
            { text: ws.ref },
          ]}
          actions={
            <ActionPanel>
              <Action title="Go to Workspace" icon={Icon.ArrowRight} onAction={() => goTo(ws)} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
              <Action.CopyToClipboard
                title="Copy Workspace Ref"
                content={ws.ref}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No workspaces"
        description="Create one with the New Workspace command."
      />
    </List>
  );
}
