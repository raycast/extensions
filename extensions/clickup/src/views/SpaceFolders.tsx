import { useFolders } from "../hooks/useFolders";
import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { FolderLists } from "./FolderLists";
import { useFolderlessTaskList } from "../hooks/useFolderlessTaskList";
import { ListTasks } from "./TaskList/ListTasks";

export function SpaceFolders({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const folders = useFolders(spaceId);
  const folderlesstasks = useFolderlessTaskList(spaceId);
  return (
    <List throttle={true} isLoading={folders === undefined} navigationTitle={`${spaceName} Folders`}>
      {folders?.map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.name}
          subtitle={`Total Tasks: ${folder.task_count}`}
          icon={Icon.Clipboard}
          actions={
            <ActionPanel title="Folder Actions">
              <PushAction title="Lists Page" target={<FolderLists folderId={folder?.id} folderName={folder?.name} />} />
            </ActionPanel>
          }
        />
      ))}
      {folderlesstasks && folderlesstasks[0] && (
        <List.Item
          title={"Folderless Tasks"}
          subtitle={`Total Tasks: ${folderlesstasks[0].task_count}`}
          icon={Icon.Hashtag}
          actions={
            <ActionPanel title="Folderless Actions">
              <PushAction
                title="Lists Page"
                target={<ListTasks listId={folderlesstasks[0].id} listName="Folderless Tasks" />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
