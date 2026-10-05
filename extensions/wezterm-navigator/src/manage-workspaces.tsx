import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useWezTermTabs } from "./hooks/useWezTerm";
import { WezTermNotFound } from "./components/WezTermNotFound";
import { RenameForm } from "./components/RenameForm";
import { renameWorkspace, createWorkspace, deleteWorkspace } from "./utils/wezterm";
import { CreateWorkspaceForm } from "./components/CreateWorkspaceForm";

export default function ManageWorkspaces() {
  const { workspaces, isLoading, revalidate, isWezTermInstalled } = useWezTermTabs();

  if (!isLoading && !isWezTermInstalled) {
    return (
      <List>
        <WezTermNotFound />
      </List>
    );
  }

  async function handleRenameWorkspace(oldName: string, newName: string) {
    try {
      await renameWorkspace(oldName, newName);
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleCreateWorkspace(name: string, cwd?: string) {
    try {
      await createWorkspace(name, cwd);
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteWorkspace(name: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Deleting workspace "${name}"...` });
      await deleteWorkspace(name);
      await showToast({ style: Toast.Style.Success, title: `Workspace "${name}" deleted` });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search workspaces..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Create New Workspace…"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<CreateWorkspaceForm onCreate={handleCreateWorkspace} />}
          />
        </ActionPanel>
      }
    >
      {!isLoading && workspaces.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title="No Workspaces Found"
          description="Open WezTerm to get started."
        />
      )}
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.name}
          title={workspace.name}
          icon={Icon.AppWindowGrid3x3}
          accessories={[
            {
              tag: {
                value: `${workspace.tabCount} tab${workspace.tabCount !== 1 ? "s" : ""}`,
                color: Color.Blue,
              },
            },
            {
              tag: {
                value: `${workspace.paneCount} pane${workspace.paneCount !== 1 ? "s" : ""}`,
                color: Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Manage">
                <Action.Push
                  title="Create New Workspace…"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateWorkspaceForm onCreate={handleCreateWorkspace} />}
                />
                <Action.Push
                  title="Rename Workspace…"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  target={
                    <RenameForm
                      type="Workspace"
                      currentName={workspace.name}
                      onRename={(newName) => handleRenameWorkspace(workspace.name, newName)}
                    />
                  }
                />
                <Action
                  title="Delete Workspace"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => handleDeleteWorkspace(workspace.name)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy Workspace Name"
                  content={workspace.name}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
