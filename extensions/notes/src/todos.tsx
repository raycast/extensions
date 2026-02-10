import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTodos, addTodo, toggleTodo, deleteTodo, deleteCompletedTodos } from "./storage";
import { Todo } from "./types";

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  async function refresh() {
    setIsLoading(true);
    setTodos(await getTodos());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(title: string) {
    if (!title.trim()) return;
    await addTodo(title.trim());
    setSearchText("");
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Todo added" });
  }

  async function handleToggle(todo: Todo) {
    await toggleTodo(todo.id);
    await refresh();
  }

  async function handleDelete(todo: Todo) {
    await deleteTodo(todo.id);
    await showToast({ style: Toast.Style.Success, title: "Todo deleted" });
    await refresh();
  }

  async function handleClearCompleted() {
    if (
      await confirmAlert({
        title: "Clear Completed",
        message: "Delete all completed todos?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteCompletedTodos();
      await showToast({ style: Toast.Style.Success, title: "Completed todos cleared" });
      await refresh();
    }
  }

  const pending = todos.filter((t) => !t.isCompleted);
  const completed = todos.filter((t) => t.isCompleted);
  const trimmed = searchText.trim();

  // Filter manually since we disabled built-in filtering
  const filterFn = (t: Todo) => !trimmed || t.title.toLowerCase().includes(trimmed.toLowerCase());
  const filteredPending = pending.filter(filterFn);
  const filteredCompleted = completed.filter(filterFn);
  const exactMatch = todos.some((t) => t.title.toLowerCase() === trimmed.toLowerCase());

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type to add or search todos..."
    >
      {todos.length === 0 && !trimmed && !isLoading ? (
        <List.EmptyView
          title="No Todos"
          description="Type something and press Enter to add your first todo."
          icon={Icon.CheckCircle}
        />
      ) : (
        <>
          {trimmed && !exactMatch && (
            <List.Item
              title={`Add "${trimmed}"`}
              icon={{ source: Icon.PlusCircle, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Add Todo" icon={Icon.PlusCircle} onAction={() => handleAdd(trimmed)} />
                </ActionPanel>
              }
            />
          )}
          <List.Section title="Pending" subtitle={`${filteredPending.length}`}>
            {filteredPending.map((todo) => (
              <List.Item
                key={todo.id}
                title={todo.title}
                icon={{ source: Icon.Circle, tintColor: Color.Orange }}
                accessories={[{ date: new Date(todo.createdAt) }]}
                actions={
                  <ActionPanel>
                    <Action title="Complete" icon={Icon.CheckCircle} onAction={() => handleToggle(todo)} />
                    <Action
                      title="Delete"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(todo)}
                    />
                    {completed.length > 0 && (
                      <Action title="Clear Completed" icon={Icon.XMarkCircle} onAction={handleClearCompleted} />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {filteredCompleted.length > 0 && (
            <List.Section title="Completed" subtitle={`${filteredCompleted.length}`}>
              {filteredCompleted.map((todo) => (
                <List.Item
                  key={todo.id}
                  title={todo.title}
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  accessories={[{ date: new Date(todo.createdAt) }]}
                  actions={
                    <ActionPanel>
                      <Action title="Uncomplete" icon={Icon.Circle} onAction={() => handleToggle(todo)} />
                      <Action
                        title="Delete"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => handleDelete(todo)}
                      />
                      <Action title="Clear Completed" icon={Icon.XMarkCircle} onAction={handleClearCompleted} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
