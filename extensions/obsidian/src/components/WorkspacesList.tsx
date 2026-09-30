import { ObsidianVault, Vault, Obsidian, ObsidianTargetType } from "@/obsidian";
import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@raycast/api";
import { useState } from "react";

interface WorkspacesListProps {
  vault: ObsidianVault;
}

export default function WorkspacesList({ vault }: WorkspacesListProps) {
  const { configFileName } = getPreferenceValues();
  const workspacesJson = Vault.getWorkspaces(vault.path, configFileName);
  const [activeWorkspace, setActiveWorkspace] = useState<string | undefined>(workspacesJson?.active);

  if (!workspacesJson || !workspacesJson.workspaces) {
    return (
      <List>
        <List.EmptyView title="No Workspaces Found" description="No workspaces.json file found in this vault." />
      </List>
    );
  }

  const workspaceEntries = Object.entries(workspacesJson.workspaces);

  const handleOpenWorkspace = (workspaceName: string) => {
    setActiveWorkspace(workspaceName);
    open(
      Obsidian.getTarget({
        type: ObsidianTargetType.OpenWorkspace,
        vault: vault,
        workspace: workspaceName,
      })
    );
  };

  return (
    <List searchBarPlaceholder="Search workspaces...">
      {workspaceEntries.map(([workspaceName, _workspace]) => {
        void _workspace;
        const isActive = workspaceName === activeWorkspace;
        return (
          <List.Item
            key={workspaceName}
            title={workspaceName}
            icon={Icon.Desktop}
            accessories={isActive ? [{ icon: Icon.CheckCircle, tooltip: "Active Workspace" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Open Workspace"
                  icon={Icon.ArrowRight}
                  onAction={() => handleOpenWorkspace(workspaceName)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
