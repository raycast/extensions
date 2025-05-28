import { List, Detail, Toast, showToast, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { Todo } from "./types";
import * as wip from "./oauth/wip";
import { formatDistanceStrict } from "date-fns";
import debounce from "lodash.debounce";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAndSetTodos = async () => {
      try {
        await wip.authorize();
        const fetchedTodos = await wip.fetchTodos(searchQuery);
        setTodos(fetchedTodos);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    };
    const debouncedFetch = debounce(fetchAndSetTodos, 300);
    debouncedFetch();
  }, [searchQuery]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search todos…" onSearchTextChange={setSearchQuery}>
      {todos.map((todo) => (
        <List.Item
          key={todo.id}
          title={todo.body}
          subtitle={formatDistanceStrict(new Date(todo.created_at), new Date(), { addSuffix: true })}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={todo.url} />
              <Action.OpenInBrowser url={`${todo.url}/similar`} title="See Similar Todos" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
