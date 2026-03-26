import { Icon, List } from "@raycast/api";
import { ALL_WORKSPACES_ID, useWorkspaces } from "../hooks/use-workspaces";

function WorkspaceDropdown({
  workspaces,
  selectedId,
  onSelect,
}: {
  workspaces: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <List.Dropdown onChange={onSelect} tooltip="Select Workspace" value={selectedId}>
      <List.Dropdown.Item icon={Icon.Globe} key="all" title="All Workspaces" value={ALL_WORKSPACES_ID} />
      {workspaces.map((w) => (
        <List.Dropdown.Item key={w.id} title={w.name} value={w.id} />
      ))}
    </List.Dropdown>
  );
}

export function useWorkspaceDropdown() {
  const { workspaces, workspaceId, allWorkspaceIds, isAllWorkspaces, selectWorkspace, isLoading } = useWorkspaces();

  const dropdown =
    workspaces.length > 1 ? (
      <WorkspaceDropdown onSelect={selectWorkspace} selectedId={workspaceId || ""} workspaces={workspaces} />
    ) : undefined;

  return {
    workspaceId,
    allWorkspaceIds,
    isAllWorkspaces,
    workspaces,
    isLoading,
    dropdown,
  };
}
