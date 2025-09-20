import { useFolders } from "../hooks/useFolders";
import { Action, ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { FolderLists } from "./FolderLists";
import { useFolderlessTaskList } from "../hooks/useFolderlessTaskList";
import { ListTasks } from "./TaskList/ListTasks";

export function SpaceFolders({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const { isLoading: isLoadingFolders, folders } = useFolders(spaceId);
  const { isLoading: isLoadingLists, lists: folderlesstasks } = useFolderlessTaskList(spaceId);
  return (
    <List
      throttle={true}
      isLoading={isLoadingFolders || isLoadingLists}
      navigationTitle={`${spaceName} Folders`}
      searchBarPlaceholder="Search folders"
    >
      <List.Section title={`Spaces / ${spaceId}`} subtitle={`${folders.length} folders`}>
        {folders.map((folder) => (
          <List.Item
            key={folder.id}
            title={folder.name}
            subtitle={`Total Tasks: ${folder.task_count}`}
            icon={Icon.Folder}
            actions={
              <ActionPanel title="Folder Actions">
                <Action.Push
                  icon={Icon.Eye}
                  title="Lists Page"
                  target={<FolderLists folderId={folder?.id} folderName={folder?.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {folderlesstasks.length ? (
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
      ) : undefined}
    </List>
  );
}
