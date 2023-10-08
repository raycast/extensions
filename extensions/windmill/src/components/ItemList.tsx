import { ActionPanel, List, Action, Icon, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { ScriptFlowForm } from "./ScriptFlowForm";
import { StarAction } from "../actions/StarAction";
import {
  WorkspaceConfig,
  Kind,
  ExtendedWindmillWorkspacePair,
  VariableListItemExtended,
  ResourceListItemExtended,
  ScheduleListItemExtended,
} from "../types";
import { useCallback, useState } from "react";
import { VariableForm } from "./VariableForm";
import { ResourceForm } from "./ResourceForm";
import fetch from "node-fetch";

const icons: Record<Kind, Icon> = {
  script: Icon.Code,
  flow: Icon.Store,
  app: Icon.AppWindowGrid2x2,
  raw_app: Icon.AppWindowGrid2x2,
  variable: Icon.AtSymbol,
  resource: Icon.Gear,
  user: Icon.Person,
  group: Icon.PersonLines,
  // schedule: Icon.Clock,
  schedule: Icon.Bell,
  folder: Icon.Folder,
};

export function ItemList({
  isLoading,
  items,
  workspaces,
  refreshItems,
}: {
  isLoading: boolean;
  items: ExtendedWindmillWorkspacePair[];
  workspaces: WorkspaceConfig[];
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
}) {
  const noWorkspaces = workspaces.length === 0;

  const [currentWorkspace, setCurrentWorkspace] = useState("All");

  function onWorkspaceChange(workspace: string) {
    setCurrentWorkspace(workspace);
  }

  const refreshAllItems = useCallback(async () => {
    await refreshItems(workspaces);
  }, [workspaces]);

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
                shortcut={Keyboard.Shortcut.Common.New}
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
            const kind = item.kind;

            let id = "";
            let title = "";
            let subtitle = "";
            let icon = icons[kind];

            const accessories = [];
            let actions = null;

            if (kind === "script" || kind === "flow" || kind === "app" || kind === "raw_app") {
              id = workspace.id + ":" + item.path;
              title = item.path; // + (item.starred ? " ⭐️" : "") //+ (item.draft_only ? " 📝" : "");

              item.draft_only && accessories.push({ text: "", icon: Icon.BlankDocument, tooltip: "Draft Only" });
              item.starred && accessories.push({ text: "️", icon: Icon.Bookmark, tooltip: "Starred" });

              subtitle = item.summary || "";
              const path = item.path;
              actions = (
                <ScriptKindActionPanel
                  kind={kind}
                  path={path}
                  starred={item.starred}
                  workspace={workspace}
                  refreshAllItems={refreshAllItems}
                />
              );
            }
            if (kind === "variable") {
              title = item.path;
              id = workspace.id + ":" + item.path;
              subtitle = item.description || "";
              actions = (
                <VariablesActionPanel
                  item={item}
                  refreshItems={refreshItems}
                  workspace={workspace}
                  refreshAllItems={refreshAllItems}
                />
              );
              if (item.is_secret) {
                accessories.push({ tag: "", icon: Icon.Lock, tooltip: "Secret" });
              }
              if (item.is_linked) {
                accessories.push({ tag: "", icon: Icon.Link, tooltip: "Linked" });
              }
              if (item.is_oauth) {
                accessories.push({ tag: "", icon: Icon.Key, tooltip: "OAuth" });
              }
            }
            if (kind === "resource") {
              title = item.path;
              id = workspace.id + ":" + item.path;
              subtitle = item.description || "";
              if (item.is_linked) {
                accessories.push({ tag: "", icon: Icon.Link, tooltip: "Linked" });
              }
              actions = (
                <ResourcesActionPanel
                  refreshItems={refreshItems}
                  item={item}
                  workspace={workspace}
                  refreshAllItems={refreshAllItems}
                />
              );
            }
            if (kind === "folder") {
              id = workspace.id + ":" + item.name;
              title = item.name;
              subtitle = item.display_name;
              actions = <FoldersActionPanel workspace={workspace} refreshAllItems={refreshAllItems} />;
            }
            if (kind === "schedule") {
              id = workspace.id + ":" + item.path + ":" + item.schedule;
              title = item.path;
              subtitle = item.schedule;
              if (item.enabled) {
                // accessories.push({
                //   tag: { value: "", color: Color.Green },
                //   icon: Icon.CheckCircle,
                //   tooltip: "Enabled",
                // });
              } else {
                // accessories.push({ tag: "", icon: Icon.XMarkCircle, tooltip: "Disabled" });
                title = "";
                subtitle = `${item.path}   ${item.schedule}`;
                icon = Icon.BellDisabled;
              }
              actions = <ScheduleActionPanel item={item} workspace={workspace} refreshAllItems={refreshAllItems} />;
            }

            if (kind === "group") {
              id = workspace.id + ":" + item.name;
              title = item.name;
              subtitle = item.summary;
              actions = <GroupActionPanel workspace={workspace} refreshAllItems={refreshAllItems} />;
            }

            if (kind === "user") {
              title = `${item.username} (${item.email})`;
              id = workspace.id + ":" + item.username;
              if (item.operator) {
                accessories.push({ text: "Operator", icon: Icon.Person, tooltip: "Operator" });
              }
              if (item.disabled) {
                title = "";
                subtitle = `${item.username} (${item.email}) `;
                accessories.push({ text: "Disabled", icon: Icon.EyeDisabled, tooltip: "Disabled" });
              }
              if (item.is_admin) {
                accessories.push({ text: "Admin", icon: Icon.Person, tooltip: "Admin" });
              }
              if (item.role) {
                accessories.push({ tag: item.role });
              }
              actions = <UserActionPanel workspace={workspace} refreshAllItems={refreshAllItems} />;
            }

            accessories.push({ tag: workspace.workspaceName, icon: Icon.Building, tooltip: "Workspace" });

            return (
              <List.Item
                id={id}
                key={id}
                title={title}
                subtitle={subtitle}
                icon={icon}
                accessories={accessories}
                actions={actions}
              />
            );
          })
      )}
    </List>
  );
}

function UserActionPanel({ workspace, refreshAllItems }: { workspace: WorkspaceConfig; refreshAllItems: () => void }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open In Users Page"
        icon={icons.user}
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`${workspace.remoteURL}workspace_settings?tab=users&workspace=${workspace.workspaceId}`}
      />
      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
    </ActionPanel>
  );
}

function GroupActionPanel({ workspace, refreshAllItems }: { workspace: WorkspaceConfig; refreshAllItems: () => void }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open In Groups Page"
        icon={icons.group}
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`${workspace.remoteURL}groups?&workspace=${workspace.workspaceId}`}
      />
      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
    </ActionPanel>
  );
}

function ScheduleActionPanel({
  item,
  workspace,
  refreshAllItems,
}: {
  item: ScheduleListItemExtended;
  workspace: WorkspaceConfig;
  refreshAllItems: () => void;
}) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open In Schedules Page"
        icon={icons.schedule}
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`${workspace.remoteURL}schedules?&workspace=${workspace.workspaceId}`}
      />
      {item.enabled ? (
        <Action
          title="Disable Schedule"
          icon={Icon.XMarkCircle}
          onAction={async () => {
            await setScheduleStatus(item, workspace, false);
            refreshAllItems();
          }}
        />
      ) : (
        <Action
          title="Enable Schedule"
          icon={Icon.CheckCircle}
          onAction={async () => {
            await setScheduleStatus(item, workspace, true);
            refreshAllItems();
          }}
        />
      )}
      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
    </ActionPanel>
  );
}

async function setScheduleStatus(item: ScheduleListItemExtended, workspace: WorkspaceConfig, enabled: boolean) {
  const response = await fetch(
    `${workspace.remoteURL}api/w/${workspace.workspaceId}/schedules/setenabled/${item.path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workspace.workspaceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enabled: enabled,
      }),
    }
  );

  console.log("response", await response.text());

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

const RefreshAllItemsAction = ({ refreshAllItems }: { refreshAllItems: () => void }) => {
  return (
    <Action
      title="Refresh List"
      icon={Icon.RotateAntiClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refreshAllItems}
    />
  );
};

function FoldersActionPanel({
  workspace,
  refreshAllItems,
}: {
  workspace: WorkspaceConfig;
  refreshAllItems: () => void;
}) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open In Folders Page"
        icon={icons.folder}
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`${workspace.remoteURL}folders?&workspace=${workspace.workspaceId}`}
      />
      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
    </ActionPanel>
  );
}

function VariablesActionPanel({
  item,
  workspace,
  refreshAllItems,
  refreshItems,
}: {
  item: VariableListItemExtended;
  workspace: WorkspaceConfig;
  refreshAllItems: () => void;
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
}) {
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.TextInput}
        title={`Edit Variable`}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<VariableForm item={item} workspace={workspace} refreshItems={refreshItems} />}
      />

      <Action.OpenInBrowser
        title="Open In Variables Page"
        icon={icons.variable}
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`${workspace.remoteURL}variables?&workspace=${workspace.workspaceId}`}
      />

      <Action.Push
        icon={Icon.Plus}
        title={`Create Variable`}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<VariableForm workspace={workspace} refreshItems={refreshItems} />}
      />

      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
    </ActionPanel>
  );
}

function ResourcesActionPanel({
  item,
  workspace,
  refreshAllItems,
  refreshItems,
}: {
  item: ResourceListItemExtended;
  workspace: WorkspaceConfig;
  refreshAllItems: () => void;
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
}) {
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.TextInput}
        title="Edit Resource"
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<ResourceForm item={item} workspace={workspace} refreshItems={refreshItems} />}
      />
      <Action.OpenInBrowser
        title="Open In Resources Page"
        icon={icons.resource}
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`${workspace.remoteURL}resources?&workspace=${workspace.workspaceId}`}
      />
      <Action.Push
        icon={Icon.Plus}
        title="Create Resource"
        shortcut={Keyboard.Shortcut.Common.New}
        target={<ResourceForm workspace={workspace} refreshItems={refreshItems} />}
      />

      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
    </ActionPanel>
  );
}

function ScriptKindActionPanel({
  kind,
  path,
  starred,
  workspace,
  refreshAllItems,
}: {
  kind: Kind;
  path: string;
  starred: boolean;
  workspace: WorkspaceConfig;
  refreshAllItems: () => void;
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
        shortcut={Keyboard.Shortcut.Common.Open}
        title={`Open ${kind.charAt(0).toUpperCase() + kind.slice(1)}`}
        url={`${workspace.remoteURL}${kind}s/get/${path}?workspace=${workspace.workspaceId}`}
      />
      <Action.CopyToClipboard
        shortcut={Keyboard.Shortcut.Common.Copy}
        title={`Copy ${kind.charAt(0).toUpperCase() + kind.slice(1)} URL`}
        content={`${workspace.remoteURL}${kind}s/get/${path}?workspace=${workspace.workspaceId}`}
      />

      <Action.OpenInBrowser
        title={`Edit ${kind.charAt(0).toUpperCase() + kind.slice(1)}`}
        shortcut={Keyboard.Shortcut.Common.Edit}
        url={`${workspace.remoteURL}${kind}s/edit/${path}?workspace=${workspace.workspaceId}`}
      />
      {(kind === "script" || kind === "flow") && (
        <Action.OpenInBrowser
          title="Open Past Runs"
          url={`${workspace.remoteURL}runs/${path}?workspace=${workspace.workspaceId}`}
        />
      )}
      <StarAction path={path} kind={kind} starred={starred} onAction={refreshAllItems} workspace={workspace} />
      <RefreshAllItemsAction refreshAllItems={refreshAllItems} />
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
