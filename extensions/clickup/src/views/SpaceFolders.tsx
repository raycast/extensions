import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { FolderLists } from "./FolderLists";
import { ListTasks } from "./TaskList/ListTasks";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { CopyId } from "../components/actions/CopyActions";
import { pluralize } from "../utils/format-helpers";
import { buildFolderRoute, buildListRoute } from "../utils/link-helpers";

interface Props {
  spaceId: string;
  spaceName: string;
  teamId: string;
}

export function SpaceFolders({ spaceId, spaceName, teamId }: Props) {
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
      navigationTitle={`${spaceName} / Folders`}
      searchBarPlaceholder="Search folders and lists"
    >
      {folders.length > 0 && (
        <List.Section title="Folders" subtitle={`${folders.length} ${pluralize(folders.length, "folder")}`}>
          {folders.map((folder) => {
            const taskCount = parseInt(String(folder.task_count || 0), 10) || 0;
            return (
              <List.Item
                key={folder.id}
                title={folder.name}
                icon={Icon.Folder}
                accessories={[{ text: `${taskCount} ${pluralize(taskCount, "task")}` }]}
                actions={
                  <ActionPanel title="Folder Actions">
                    <Action.Push
                      icon={Icon.ChevronRight}
                      title="Browse Lists"
                      target={<FolderLists folderId={folder.id} folderName={folder.name} teamId={teamId} />}
                    />
                    <OpenInClickUpAction route={buildFolderRoute(teamId, folder.id)} />
                    <CopyId id={folder.id} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {folderlessLists.length > 0 && (
        <List.Section
          title="Lists"
          subtitle={`${folderlessLists.length} ${pluralize(folderlessLists.length, "list")} without folder`}
        >
          {folderlessLists.map((list) => {
            const taskCount = parseInt(String(list.task_count || 0), 10) || 0;
            return (
              <List.Item
                key={list.id}
                title={list.name}
                icon={Icon.List}
                accessories={[{ text: `${taskCount} ${pluralize(taskCount, "task")}` }]}
                actions={
                  <ActionPanel title="List Actions">
                    <Action.Push
                      icon={Icon.ChevronRight}
                      title="Browse Tasks"
                      target={<ListTasks listId={list.id} listName={list.name} />}
                    />
                    <OpenInClickUpAction route={buildListRoute(teamId, list.id)} />
                    <CopyId id={list.id} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
