import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { FolderLists } from "./FolderLists";
import { ListTasks } from "./TaskList/ListTasks";

interface Props {
  spaceId: string;
  spaceName: string;
}

export function SpaceFolders({ spaceId, spaceName }: Props) {
  const { isLoading: isLoadingFolders, data: folders } = useCachedPromise(
    async (id: string) => getClickUpClient().getFolders(id),
    [spaceId],
    { initialData: [] },
  );

  const { isLoading: isLoadingLists, data: folderlessLists } = useCachedPromise(
    async (id: string) => getClickUpClient().getFolderlessLists(id),
    [spaceId],
    { initialData: [] },
  );

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
                  target={<FolderLists folderId={folder.id} folderName={folder.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {folderlessLists.length > 0 && (
        <List.Item
          title="Folderless Tasks"
          subtitle={`Total Tasks: ${folderlessLists[0].task_count}`}
          icon={Icon.Hashtag}
          actions={
            <ActionPanel title="Folderless Actions">
              <Action.Push
                title="Lists Page"
                target={<ListTasks listId={folderlessLists[0].id} listName="Folderless Tasks" />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
