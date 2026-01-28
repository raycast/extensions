import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { ListTasks } from "./TaskList/ListTasks";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { CopyId } from "../components/actions/CopyActions";
import { pluralize } from "../utils/format-helpers";
import { buildListRoute } from "../utils/link-helpers";

interface Props {
  folderId: string;
  folderName: string;
  teamId: string;
}

export function FolderLists({ folderId, folderName, teamId }: Props) {
  const { isLoading, data: lists } = useCachedPromise(
    async (id: string) => getClickUpClient().getLists(id),
    [folderId],
    { initialData: [] },
  );

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      navigationTitle={`${folderName} / Lists`}
      searchBarPlaceholder="Search lists"
    >
      <List.Section title="Lists" subtitle={`${lists.length} ${pluralize(lists.length, "list")}`}>
        {lists.map((list) => {
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
    </List>
  );
}
