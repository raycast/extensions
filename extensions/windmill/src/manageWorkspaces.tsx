import { ActionPanel, List, Action, Icon, Keyboard } from "@raycast/api";
import { WorkspaceForm } from "./components/WorkspaceForm";
import { useState } from "react";

import { saveWorkspace, useFetchWorkspaces } from "./hooks/useFetchWorkspaces";

import { LaunchProps } from "@raycast/api";
import { WorkspaceConfig } from "./types";

export default function ListWorkspacesCommand(props: LaunchProps) {
  const { workspaces, fetchWorkspaces, isLoading } = useFetchWorkspaces(true);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if the context { createNew: true } is passed with launchCommand()
  if (props.launchContext?.createNew) {
    return <WorkspaceForm name={searchText} onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />;
  }

  return (
    <List onSearchTextChange={(newValue) => setSearchText(newValue)} isLoading={isLoading || loading}>
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
                shortcut={Keyboard.Shortcut.Common.New}
                target={<WorkspaceForm name={searchText} onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        workspaces.map((workspace: WorkspaceConfig) => (
          <List.Item
            // icon={workspace.disabled ? Icon.EyeDisabled : Icon.Building}
            icon={Icon.Building}
            key={workspace.id}
            id={workspace.id}
            title={workspace.disabled ? "" : workspace.workspaceName}
            subtitle={workspace.disabled ? `${workspace.workspaceName}   ${workspace.remoteURL}` : workspace.remoteURL}
            accessories={workspace.disabled ? [{ text: "Disabled", tooltip: "Disabled", icon: Icon.EyeDisabled }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Workspace"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<WorkspaceForm workspace={workspace} onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />}
                />

                <Action
                  title={workspace.disabled ? "Enable Workspace" : "Disable Workspace"}
                  icon={workspace.disabled ? Icon.CheckCircle : Icon.XMarkCircle}
                  onAction={async () => {
                    setLoading(true);
                    await saveWorkspace({ ...workspace, disabled: !workspace.disabled });
                    await fetchWorkspaces();
                    setLoading(false);
                  }}
                />
                <Action.Push
                  title="Add Workspace"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<WorkspaceForm onCreate={fetchWorkspaces} onDelete={fetchWorkspaces} />}
                />
                <Action.CopyToClipboard
                  title="Copy Config to Clipboard"
                  shortcut={Keyboard.Shortcut.Common.Copy}
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
