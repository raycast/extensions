import { ActionPanel, Color, ImageLike, ImageMask, List, showToast, ToastStyle } from "@raycast/api";
import { Todo, User } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { CloseAllTodoAction, CloseTodoAction, ShowTodoDetailsAction } from "./todo_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { useTodos } from "./todo/utils";

function userToIcon(user?: User): ImageLike {
  let result = "";
  if (!user) {
    return "";
  }
  if (user.avatar_url) {
    result = user.avatar_url;
  }
  return { source: result, mask: ImageMask.Circle };
}

export function TodoList(): JSX.Element {
  const { todos, error, isLoading, performRefetch: refresh } = useTodos();

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Merge Requests", error);
  }

  if (!todos) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List searchBarPlaceholder="Filter Todos by name..." isLoading={isLoading} throttle={true}>
      {todos?.map((todo) => (
        <TodoListItem key={todo.id} todo={todo} refreshData={refresh} />
      ))}
    </List>
  );
}

export function TodoListItem(props: { todo: Todo; refreshData: () => void }): JSX.Element {
  const todo = props.todo;
  const subtitle = todo.group ? todo.group.full_path : todo.project_with_namespace || "";
  return (
    <List.Item
      id={todo.id.toString()}
      title={todo.title}
      subtitle={subtitle}
      accessoryTitle={todo.action_name}
      accessoryIcon={userToIcon(todo.author)}
      icon={{ source: GitLabIcons.todo, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowTodoDetailsAction todo={todo} />
            <GitLabOpenInBrowserAction url={todo.target_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CloseTodoAction todo={todo} finished={props.refreshData} />
            <CloseAllTodoAction finished={props.refreshData} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
