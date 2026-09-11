import { Icon, List } from "@raycast/api";

import { ALL_WORKSPACES_ID, useWorkspaces } from "../hooks/use-workspaces";

const WorkspaceDropdown = ({
  workspaces,
  selectedId,
  onSelect,
}: {
  workspaces: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) => (
  <List.Dropdown onChange={onSelect} tooltip="Select Workspace" value={selectedId}>
    <List.Dropdown.Item icon={Icon.Globe} key="all" title="All Workspaces" value={ALL_WORKSPACES_ID} />
    {workspaces.map((w) => (
      <List.Dropdown.Item key={w.id} title={w.name} value={w.id} />
    ))}
  </List.Dropdown>
);

export const useWorkspaceDropdown = () => {
  const { workspaces, workspaceId, allWorkspaceIds, isAllWorkspaces, selectWorkspace, isLoading } = useWorkspaces();

  const dropdown =
    workspaces.length > 1 ? (
      <WorkspaceDropdown onSelect={selectWorkspace} selectedId={workspaceId || ""} workspaces={workspaces} />
    ) : undefined;

  return {
    allWorkspaceIds,
    dropdown,
    isAllWorkspaces,
    isLoading,
    workspaceId,
    workspaces,
  };
};
