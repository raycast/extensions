import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon, useCachedPromise, useLocalStorage } from "@raycast/utils";
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

  const {
    value: defaultTodoListConfig,
    setValue: setDefaultTodoListConfig,
    removeValue: removeDefaultTodoListConfig,
  } = useLocalStorage<string>("defaultTodoListConfig", "");

  const setDefaultTodoList = async (accountId: string, projectId: number, todoListId: number) => {
    try {
      await setDefaultTodoListConfig(`${accountId}|${projectId}|${todoListId}`);
      await showToast({
        title: "Default Todo List Set",
        style: Toast.Style.Success,
      });
    } catch (error) {
      console.error("Error setting default todo list", error);
      await showToast({
        title: "Error Setting Default Todo List",
        style: Toast.Style.Failure,
      });
    }
  };

  const removeDefaultTodoList = async () => {
    await removeDefaultTodoListConfig();
    await showToast({
      title: "Default Todo List Removed",
      style: Toast.Style.Success,
    });
  };

  return (
    <List isLoading={isLoading} pagination={pagination} navigationTitle={projectName}>
      {data?.map((todoList) => (
        <List.Item
          key={todoList.id}
          title={todoList.title}
          icon={getProgressIcon(calculateCompletedRatio(todoList.completed_ratio), Color.Green)}
          accessories={
            defaultTodoListConfig === `${accountId}|${projectId}|${todoList.id}` ? [{ icon: Icon.Star }] : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Todos"
                target={<TodosList accountId={accountId} projectId={projectId} todoListId={todoList.id} />}
              />
              <Action.OpenInBrowser title="Open in Browser" url={todoList.app_url} />
              {defaultTodoListConfig !== `${accountId}|${projectId}|${todoList.id}` && (
                <Action
                  title="Set Default Todo List"
                  onAction={() => setDefaultTodoList(accountId, projectId, todoList.id)}
                />
              )}
              {defaultTodoListConfig && (
                <Action title="Remove Default Todo List" onAction={() => removeDefaultTodoList()} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
