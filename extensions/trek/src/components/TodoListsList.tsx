import { Action, ActionPanel, Color, List } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { fetchTodoLists } from "../oauth/auth";
import TodosList from "./TodosList";
import { calculateCompletedRatio } from "../utils/math";

export default function TodoListsList({
  accountId,
  projectId,
  todosetId,
  projectName,
}: {
  accountId: string;
  projectId: number;
  todosetId: number;
  projectName: string;
}) {
  const { isLoading, data, pagination } = useCachedPromise(
    (accountId: string, projectId: number, todosetId: number) => async (options: { page: number }) => {
      const response = await fetchTodoLists(accountId, projectId, todosetId, options.page);
      return {
        data: response.data,
        hasMore: response.nextPage !== null,
      };
    },
    [accountId, projectId, todosetId],
  );

  return (
    <List isLoading={isLoading} pagination={pagination} navigationTitle={projectName}>
      {data?.map((todoList) => (
        <List.Item
          key={todoList.id}
          title={todoList.title}
          icon={getProgressIcon(calculateCompletedRatio(todoList.completed_ratio), Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Todos"
                target={<TodosList accountId={accountId} projectId={projectId} todoListId={todoList.id} />}
              />
              <Action.OpenInBrowser title="Open in Browser" url={todoList.app_url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
