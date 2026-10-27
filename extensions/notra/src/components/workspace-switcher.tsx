import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import type { Workspace } from "../types";

interface WorkspaceSwitcherProps {
  onChange: (organizationId: string) => Promise<void> | void;
  workspace: Workspace | undefined;
  workspaces: Workspace[];
}

function workspaceIcon(workspace: Workspace) {
  return workspace.logo ?? Icon.Building;
}

export function WorkspaceDropdown({ onChange, workspace, workspaces }: WorkspaceSwitcherProps) {
  return (
    <List.Dropdown onChange={onChange} tooltip="Workspace" value={workspace?.id}>
      <List.Dropdown.Section title="Workspace">
        {workspaces.map((item) => (
          <List.Dropdown.Item icon={workspaceIcon(item)} key={item.id} title={item.name} value={item.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export function WorkspaceFormDropdown({ onChange, workspace, workspaces }: WorkspaceSwitcherProps) {
  if (workspaces.length < 2) {
    return null;
  }

  return (
    <Form.Dropdown id="organizationId" onChange={onChange} title="Workspace" value={workspace?.id}>
      {workspaces.map((item) => (
        <Form.Dropdown.Item icon={workspaceIcon(item)} key={item.id} title={item.name} value={item.id} />
      ))}
    </Form.Dropdown>
  );
}

export function WorkspaceSubmenu({ onChange, workspace, workspaces }: WorkspaceSwitcherProps) {
  if (workspaces.length < 2) {
    return null;
  }

  return (
    <ActionPanel.Submenu icon={Icon.Building} title="Switch Workspace">
      {workspaces.map((item) => (
        <Action
          icon={item.id === workspace?.id ? Icon.Checkmark : workspaceIcon(item)}
          key={item.id}
          onAction={() => onChange(item.id)}
          title={item.name}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
