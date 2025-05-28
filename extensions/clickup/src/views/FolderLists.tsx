import { useLists } from "../hooks/useLists";
import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { ListTasks } from "./TaskList/ListTasks";

function FolderLists({ folderId, folderName }: { folderId: string; folderName: string }) {
  const { isLoading, lists } = useLists(folderId);
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
                  target={<ListTasks listId={list?.id} listName={list?.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export { FolderLists };
