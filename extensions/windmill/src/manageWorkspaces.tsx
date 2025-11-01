import { ActionPanel, List, Action, Icon, Keyboard } from "@raycast/api";
import { WorkspaceForm } from "./components/WorkspaceForm";
import { useState } from "react";

import { useFetchWorkspaces } from "./hooks/useFetchWorkspaces";

import { LaunchProps } from "@raycast/api";
import { WorkspaceConfig } from "./types";
import { WorkspaceSettingsDetail } from "./components/WorkspaceSettingsDetail";

export default function ListWorkspacesCommand(props: LaunchProps) {
  const { workspaces, fetchWorkspaces, isLoading } = useFetchWorkspaces();
  const [searchText, setSearchText] = useState("");

  // Check if the context { createNew: true } is passed with launchCommand()
  if (props.launchContext?.createNew) {
    return <WorkspaceForm name={searchText} onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />;
  }

  return (
    <List onSearchTextChange={(newValue) => setSearchText(newValue)} isLoading={isLoading}>
      {!isLoading && workspaces.length === 0 ? (
        <List.EmptyView
          title="No Workspaces found"
          description={
            searchText !== "" ? "Press Enter to add your workspace" : "Type the name of your workspace to create one"
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Workspace"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<WorkspaceForm name={searchText} onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        workspaces.map((workspace: WorkspaceConfig) => (
          <List.Item
            icon={Icon.Building}
            key={workspace.id}
            id={workspace.id}
            title={workspace.workspaceName}
            subtitle={workspace.remoteURL}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Workspace"
                  icon={Icon.Pencil}
                  target={<WorkspaceForm workspace={workspace} onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />}
                />
                <Action.Push
                  title="View Workspace Settings"
                  icon={Icon.Eye}
                  target={<WorkspaceSettingsDetail workspace={workspace} />}
                />
                <Action.Push
                  title="Add Workspace"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<WorkspaceForm onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />}
                />
                <Action.CopyToClipboard
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  title="Copy Config to Clipboard"
                  content={JSON.stringify({ ...workspace, id: undefined })}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
