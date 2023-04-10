import { useLists } from "../hooks/useLists";
import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { ListTasks } from "./ListTasks";

function FolderLists({ folderId, folderName }: { folderId: string; folderName: string }) {
  const lists = useLists(folderId);
  return (
    <List throttle={true} isLoading={lists === undefined} navigationTitle={`${folderName} Lists`}>
      {lists?.map((list) => (
        <List.Item
          key={list.id}
          title={list.name}
          subtitle={`Total Tasks: ${list.task_count}`}
          icon={Icon.Dot}
          actions={
            <ActionPanel title="List Actions">
              <PushAction title="List Tasks" target={<ListTasks listId={list?.id} listName={list?.name} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export { FolderLists };
