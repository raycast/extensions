import { WorkSpace } from "@coze/api";
import { PagedData } from "../net/api";
import { Action, ActionPanel, List } from "@raycast/api";

export default function WorkspaceListView(
  {
    workspaces,
    onSelect,
  }: {
    workspaces: PagedData<WorkSpace>,
    onSelect: (workspace: WorkSpace) => void,
  }
) {
  return <List
    filtering={false}
  >
    {workspaces?.items?.length === 0 ? (
      <List.EmptyView
        icon={{ source: "coze.svg" }}
        title="No workspaces found"
        description="Please create a workspace first"
      />
    ) : (
      workspaces.items.map((item: WorkSpace) => (
        <List.Item
          key={item.id}
          title={item.name}
          icon={{ source: item.icon_url }}
          subtitle={item.role_type}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => onSelect(item)}/>
            </ActionPanel>
          }
        />
      ))
    )}
  </List>
}
