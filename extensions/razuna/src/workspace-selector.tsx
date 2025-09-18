import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { razunaAPI } from "./api";
import { getSelectedWorkspace, setSelectedWorkspace } from "./types";
import type { RazunaWorkspace } from "./types";

interface WorkspaceSelectorProps {
  onWorkspaceSelected: (workspace: RazunaWorkspace) => void;
  showSwitchOption?: boolean;
}

export default function WorkspaceSelector({ onWorkspaceSelected, showSwitchOption = false }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<RazunaWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<RazunaWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { pop } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load current workspace and available workspaces simultaneously
      const [currentWorkspace, workspacesData] = await Promise.all([getSelectedWorkspace(), razunaAPI.getWorkspaces()]);

      setSelectedWorkspaceState(currentWorkspace);
      setWorkspaces(workspacesData);

      if (workspacesData.length === 0) {
        setError("No workspaces found. Please check your access token and permissions.");
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      showToast(Toast.Style.Failure, "Failed to load workspaces", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectWorkspace = async (workspace: RazunaWorkspace) => {
    try {
      await setSelectedWorkspace(workspace);
      setSelectedWorkspaceState(workspace);
      showToast(Toast.Style.Success, "Workspace selected", workspace.name);
      onWorkspaceSelected(workspace);
      pop();
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to select workspace", (err as Error).message);
    }
  };

  const clearWorkspace = async () => {
    try {
      await setSelectedWorkspace(null);
      setSelectedWorkspaceState(null);
      showToast(Toast.Style.Success, "Workspace cleared");
      pop();
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to clear workspace", (err as Error).message);
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Workspaces"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadData} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces..." navigationTitle="Select Workspace">
      {selectedWorkspace && showSwitchOption && (
        <List.Section title="Current Workspace">
          <List.Item
            title={selectedWorkspace.name}
            subtitle="Currently selected"
            icon={Icon.Checkmark}
            accessories={[{ text: "Current" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Keep Current Workspace"
                  onAction={() => onWorkspaceSelected(selectedWorkspace)}
                  icon={Icon.Checkmark}
                />
                <Action
                  title="Clear Selection"
                  onAction={clearWorkspace}
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title={selectedWorkspace ? "Switch to Different Workspace" : "Available Workspaces"}>
        {workspaces.map((workspace: RazunaWorkspace) => {
          const isCurrent = selectedWorkspace?._id === workspace._id;

          return (
            <List.Item
              key={workspace._id}
              title={workspace.name}
              subtitle={workspace.description || "No description"}
              icon={isCurrent ? Icon.Checkmark : Icon.Globe}
              accessories={isCurrent ? [{ text: "Current" }] : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title={isCurrent ? "Keep This Workspace" : "Select Workspace"}
                    onAction={() => selectWorkspace(workspace)}
                    icon={isCurrent ? Icon.Checkmark : Icon.ArrowRight}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {workspaces.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Workspaces Found"
          description="Please check your access token and permissions"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadData} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
