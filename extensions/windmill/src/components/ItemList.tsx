import { ActionPanel, List, Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import { ScriptFlowForm } from "./ScriptFlowForm";
import { StarAction } from "./StarAction";
import { WorkspaceConfig, Kind, ExtendedWindmillWorkspacePair } from "../types";
import { useState } from "react";

export function ItemList({
  isLoading,
  kind,
  items,
  workspaces,
  refreshItems,
}: {
  isLoading: boolean;
  kind: Kind;
  items: ExtendedWindmillWorkspacePair[];
  workspaces: WorkspaceConfig[];
  refreshItems: () => void;
}) {
  const icons: Record<Kind, Icon> = {
    script: Icon.Code,
    flow: Icon.Store,
    app: Icon.AppWindowGrid2x2,
    raw_app: Icon.AppWindowGrid2x2,
  };

  const noWorkspaces = workspaces.length === 0;

  const [currentWorkspace, setCurrentWorkspace] = useState("All");

  function onWorkspaceChange(workspace: string) {
    setCurrentWorkspace(workspace);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<WorkspaceDropdown workspaces={workspaces} onWorkspaceChange={onWorkspaceChange} />}
    >
      {noWorkspaces && !isLoading ? (
        <List.EmptyView
          title="No Workspaces Found"
          description="Press Enter to add a new workspace."
          actions={
            <ActionPanel>
              <Action
                title="Add Workspace"
                icon={Icon.Gear}
                onAction={async () => {
                  await launchCommand({
                    name: "manageWorkspaces",
                    type: LaunchType.UserInitiated,
                    context: { createNew: true },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        items
          .filter((item_workspace) => currentWorkspace === "All" || item_workspace[1].id === currentWorkspace)
          .map((item_workspace: ExtendedWindmillWorkspacePair) => {
            const [item, workspace] = item_workspace;
            // console.log("item", item);
            // console.log("workspace", workspace);

            return (
              <List.Item
                key={workspace.id + ":" + item.path}
                id={workspace.id + ":" + item.path}
                title={item.path + (item.starred ? " ⭐️" : "") + (item.draft_only ? " 📝" : "")}
                subtitle={item.summary || ""}
                icon={icons[kind]}
                accessories={[{ tag: workspace.workspaceName }]}
                actions={
                  <ListActionPanel
                    kind={kind}
                    path={item.path}
                    starred={item.starred}
                    workspace={workspace}
                    refreshItems={refreshItems}
                  />
                }
              />
            );
          })
      )}
    </List>
  );
}
function ListActionPanel({
  kind,
  path,
  starred,
  workspace,
  refreshItems,
}: {
  kind: Kind;
  path: string;
  starred: boolean;
  workspace: WorkspaceConfig;
  refreshItems: () => void;
}) {
  return (
    <ActionPanel>
      {(kind === "script" || kind === "flow") && (
        <Action.Push
          icon={Icon.TextInput}
          title={`Open ${kind.charAt(0).toUpperCase() + kind.slice(1)} Form`}
          target={<ScriptFlowForm path={path} kind={kind} starred={starred} workspace={workspace} />}
        />
      )}
      <Action.OpenInBrowser
        title={`Open ${kind.charAt(0).toUpperCase() + kind.slice(1)}`}
        url={`${workspace.remoteURL}${kind}s/get/${path}`}
      />
      <Action.OpenInBrowser
        title={`Edit ${kind.charAt(0).toUpperCase() + kind.slice(1)}`}
        url={`${workspace.remoteURL}${kind}s/edit/${path}`}
      />
      <Action.OpenInBrowser title="Open Past Runs" url={`${workspace.remoteURL}runs/${path}`} />
      <StarAction path={path} kind={kind} starred={starred} onAction={refreshItems} workspace={workspace} />
      <Action
        title="Reload"
        icon={Icon.RotateAntiClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={refreshItems}
      />
    </ActionPanel>
  );
}

function WorkspaceDropdown(props: { workspaces: WorkspaceConfig[]; onWorkspaceChange: (newValue: string) => void }) {
  const { workspaces, onWorkspaceChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Workspace"
      storeValue={true}
      defaultValue="All"
      onChange={(newValue) => {
        onWorkspaceChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Workspaces">
        <List.Dropdown.Item key="All" title="All" value="All" />
        {workspaces.map((workspace) => (
          <List.Dropdown.Item key={workspace.id} title={workspace.workspaceName} value={String(workspace.id)} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
