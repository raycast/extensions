import {
  ActionPanel,
  Action,
  List,
  Icon,
  confirmAlert,
  showToast,
  Toast,
  showHUD,
  Alert,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { exec } from "child_process";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import { getWorkspaces, deleteWorkspace, Workspace } from "./utils/workspaces";
import CreateWorkspace from "./create-workspace";

export default function Command() {
  const {
    data: workspaces,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return getWorkspaces();
  });

  const openWorkspace = async (workspace: Workspace) => {
    const validProjects = workspace.projects.filter((p) => {
      const expanded = p.replace(/^~/, homedir());
      return fs.existsSync(expanded);
    });

    if (validProjects.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No valid projects",
        message: "All projects in this workspace are missing",
      });
      return;
    }

    try {
      for (let i = 0; i < validProjects.length; i++) {
        const project = validProjects[i].replace(/^~/, homedir());

        if (i === 0) {
          exec(`open -a Ghostty "${project}"`);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 300));
          exec(`open -a Ghostty "${project}"`);
        }
      }

      await showHUD(`Opened ${workspace.name} (${validProjects.length} tabs)`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open workspace",
        message: String(error),
      });
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    const confirmed = await confirmAlert({
      title: "Delete Workspace",
      message: `Are you sure you want to delete "${workspace.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteWorkspace(workspace.id);
      revalidate();
      showToast({
        style: Toast.Style.Success,
        title: "Workspace deleted",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      <List.Section
        title="Saved Workspaces"
        subtitle="Open multiple projects as Ghostty tabs"
      >
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((workspace) => (
            <List.Item
              key={workspace.id}
              title={workspace.name}
              subtitle={`${workspace.projects.length} projects`}
              icon={{ source: Icon.Window, tintColor: Color.Blue }}
              accessories={[
                {
                  text: workspace.projects
                    .slice(0, 3)
                    .map((p) => path.basename(p))
                    .join(", "),
                  tooltip: workspace.projects.join("\n"),
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Open Workspace"
                      icon={Icon.Terminal}
                      onAction={() => openWorkspace(workspace)}
                    />
                    <Action.Push
                      title="Edit Workspace"
                      icon={Icon.Pencil}
                      target={
                        <CreateWorkspace
                          workspace={workspace}
                          onSave={revalidate}
                        />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create New Workspace"
                      icon={Icon.Plus}
                      target={<CreateWorkspace onSave={revalidate} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Workspace"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(workspace)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView
            title="No Workspaces"
            description="Create a workspace to open multiple projects at once"
            icon={Icon.Window}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Workspace"
                  icon={Icon.Plus}
                  target={<CreateWorkspace onSave={revalidate} />}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
