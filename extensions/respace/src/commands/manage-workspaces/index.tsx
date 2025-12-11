import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  deleteWorkspace,
  duplicateWorkspace,
  getAllWorkspaces,
} from "../../core/storage/storage";
import type { Workspace, WorkspaceItemType } from "../../types/workspace";
import { CreateWorkspaceForm } from "./components/create-workspace-form";
import { EditWorkspaceForm } from "./components/edit-workspace-form";
import { ManageItemsView } from "./components/manage-items-view";
import { getWorkspaceIcon } from "./constants/workspace-icons";
import {
  getItemColor,
  getItemIcon,
  getTypeName,
} from "./utils/workspace-helpers";

export default function ManageWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  function loadWorkspaces() {
    try {
      const data = getAllWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(workspace: Workspace) {
    const confirmed = await confirmAlert({
      title: "Delete Workspace",
      message: `Are you sure you want to delete "${workspace.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        deleteWorkspace(workspace.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Workspace deleted",
          message: workspace.name,
        });
        loadWorkspaces();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete workspace",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async function handleDuplicate(workspace: Workspace) {
    try {
      const duplicated = duplicateWorkspace(workspace.id);
      if (duplicated) {
        await showToast({
          style: Toast.Style.Success,
          title: "Workspace duplicated",
          message: duplicated.name,
        });
        loadWorkspaces();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to duplicate workspace",
          message: "Workspace not found",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search workspaces..."
      isShowingDetail
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="No Workspaces"
        description="Create your first workspace to get started"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Workspace"
              icon={Icon.Plus}
              target={
                <CreateWorkspaceForm onWorkspaceCreated={loadWorkspaces} />
              }
            />
          </ActionPanel>
        }
      />
      {workspaces.map((workspace) => {
        // Count items by type
        const itemCounts = workspace.items.reduce(
          (acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        return (
          <List.Item
            key={workspace.id}
            icon={{
              source: getWorkspaceIcon(workspace.icon),
              tintColor: Color.PrimaryText,
            }}
            title={workspace.name}
            keywords={[
              workspace.description || "",
              ...workspace.items.map((i) => i.name),
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Workspace"
                      text={workspace.name}
                      icon={{ source: getWorkspaceIcon(workspace.icon) }}
                    />
                    {workspace.description && (
                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={workspace.description}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Summary"
                      text={`${workspace.items.length} item${workspace.items.length !== 1 ? "s" : ""}`}
                    />
                    {Object.entries(itemCounts).map(([type, count]) => (
                      <List.Item.Detail.Metadata.TagList
                        key={type}
                        title={getTypeName(type as WorkspaceItemType)}
                      >
                        <List.Item.Detail.Metadata.TagList.Item
                          text={String(count)}
                          color={getItemColor(type as WorkspaceItemType)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    ))}
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Items" />
                    {workspace.items.length === 0 ? (
                      <List.Item.Detail.Metadata.Label
                        title=""
                        text="No items yet"
                      />
                    ) : (
                      workspace.items.map((item, index) => (
                        <List.Item.Detail.Metadata.Label
                          key={item.id}
                          title={`${index + 1}. ${item.name}`}
                          text={
                            item.type === "url" || item.type === "terminal"
                              ? item.path
                              : undefined
                          }
                          icon={{
                            source: getItemIcon(item.type),
                            tintColor: getItemColor(item.type),
                          }}
                        />
                      ))
                    )}
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(workspace.createdAt).toLocaleDateString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Updated"
                      text={new Date(workspace.updatedAt).toLocaleDateString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Workspace"
                    icon={Icon.Pencil}
                    target={
                      <EditWorkspaceForm
                        workspace={workspace}
                        onWorkspaceUpdated={loadWorkspaces}
                      />
                    }
                  />
                  <Action.Push
                    title="Manage Items"
                    icon={Icon.List}
                    target={
                      <ManageItemsView
                        workspace={workspace}
                        onWorkspaceUpdated={loadWorkspaces}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                  <Action.Push
                    title="Create New Workspace"
                    icon={Icon.Plus}
                    target={
                      <CreateWorkspaceForm
                        onWorkspaceCreated={loadWorkspaces}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Duplicate Workspace"
                    icon={Icon.CopyClipboard}
                    onAction={() => handleDuplicate(workspace)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Workspace"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(workspace)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
