import { WorkSpace } from "@coze/api";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useWorkspaces from "../hooks/useWorkspaces";
import ErrorView from "./ErrorView";
import EmptyData from "./EmptyData";
import { APIInstance } from "../services/api";

export default function WorkspaceListView({
  isLoading: isDefaultLoading,
  api,
  onSelect,
}: {
  isLoading: boolean;
  api?: APIInstance;
  onSelect: (workspace: WorkSpace) => void;
}) {
  const { workspaces, setWorkspaceId, workspaceError, isLoading: isWorkspaceLoading } = useWorkspaces(api);
  const isLoading = isDefaultLoading || isWorkspaceLoading;

  if (workspaceError) {
    return <ErrorView error={workspaceError} />;
  }

  return (
    <List
      isLoading={isLoading}
      onSelectionChange={(id) => {
        api?.log(`[WorkspaceListView] workspace changed: ${id}`);
        id && setWorkspaceId(id);
      }}
    >
      {workspaces?.length === 0 && !isLoading ? (
        <EmptyData title="workspace" />
      ) : (
        workspaces.map((item: WorkSpace) => (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.name}
            icon={{ source: item.icon_url }}
            accessories={[
              { text: item.role_type },
              {
                icon: item.workspace_type === "personal" ? Icon.Person : Icon.TwoPeople,
                tooltip: item.workspace_type === "personal" ? "Personal" : "Team",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => onSelect(item)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
