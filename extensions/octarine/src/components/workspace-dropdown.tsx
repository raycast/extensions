import { List } from "@raycast/api";
import { ALL_WORKSPACES } from "@type/notes";
import type { Workspace } from "@type/octarine";

type Props = {
  workspaces: Workspace[];
  value: string;
  onChange: (value: string) => void;
};

export function WorkspaceDropdown({ workspaces, value, onChange }: Props) {
  return (
    <List.Dropdown tooltip="Filter by workspace" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Workspaces" value={ALL_WORKSPACES} />
      {workspaces.map((workspace) => (
        <List.Dropdown.Item title={workspace.display ?? workspace.name} key={workspace.path} value={workspace.path} />
      ))}
    </List.Dropdown>
  );
}
