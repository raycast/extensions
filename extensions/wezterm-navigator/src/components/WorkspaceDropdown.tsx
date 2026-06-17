import { Icon, List } from "@raycast/api";
import { WezTermWorkspace } from "../types";

interface WorkspaceDropdownProps {
  workspaces: WezTermWorkspace[];
  onWorkspaceChange: (workspace: string) => void;
}

export function WorkspaceDropdown({ workspaces, onWorkspaceChange }: WorkspaceDropdownProps) {
  return (
    <List.Dropdown tooltip="Filter by Workspace" storeValue onChange={onWorkspaceChange}>
      <List.Dropdown.Item title="All Workspaces" value="all" icon={Icon.AppWindowGrid3x3} />
      <List.Dropdown.Section title="Workspaces">
        {workspaces.map((ws) => (
          <List.Dropdown.Item key={ws.name} title={ws.name} value={ws.name} icon={Icon.Window} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
