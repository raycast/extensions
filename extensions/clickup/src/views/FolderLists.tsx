import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { ListTasks } from "./TaskList/ListTasks";

interface Props {
  folderId: string;
  folderName: string;
}

export function FolderLists({ folderId, folderName }: Props) {
  const { isLoading, data: lists } = useCachedPromise(
    async (id: string) => getClickUpClient().getLists(id),
    [folderId],
    { initialData: [] },
  );

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      navigationTitle={`${folderName} Lists`}
      searchBarPlaceholder="Search lists"
    >
      <List.Section title={`Folders / ${folderId}`} subtitle={`${lists.length} lists`}>
        {lists.map((list) => (
          <List.Item
            key={list.id}
            title={list.name}
            subtitle={`Total Tasks: ${list.task_count}`}
            icon={Icon.Dot}
            actions={
              <ActionPanel title="List Actions">
                <Action.Push
                  icon={Icon.Eye}
                  title="List Tasks"
                  target={<ListTasks listId={list.id} listName={list.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
