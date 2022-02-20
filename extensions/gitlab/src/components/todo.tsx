import { ActionPanel, Color, ImageLike, ImageMask, List, showToast, ToastStyle } from "@raycast/api";
import { Todo, User } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { gitlab } from "../common";
import { useState, useEffect } from "react";
import { CloseAllTodoAction, CloseTodoAction, ShowTodoDetailsAction } from "./todo_actions";
import { getErrorMessage, now } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";

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
  const [searchText, setSearchText] = useState<string>();
  const { todos, error, isLoading, refresh } = useSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Merge Requests", error);
  }

  if (!todos) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter Todos by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
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

export function useSearch(query: string | undefined): {
  todos?: Todo[];
  error?: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [todos, setTodos] = useState<Todo[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timestamp, setTimestamp] = useState<Date>(now());

  const refresh = () => {
    setTimestamp(now());
  };

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glTodos = await gitlab.getTodos({ search: query || "" });

        if (!didUnmount) {
          setTodos(glTodos);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query, timestamp]);

  return { todos, error, isLoading, refresh };
}
