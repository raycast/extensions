import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { Filter, Todo } from "./types";
import { CreateTodoAction, DeleteTodoAction, EmptyView, ToggleTodoAction } from "./components";

type State = {
  filter: Filter;
  isLoading: boolean;
  searchText: string;
  todos: Todo[];
  visibleTodos: Todo[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: Filter.All,
    isLoading: true,
    searchText: "",
    todos: [],
    visibleTodos: [],
  });

  useEffect(() => {
    (async () => {
      const storedTodos = await LocalStorage.getItem<string>("todos");

      if (!storedTodos) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const todos: Todo[] = JSON.parse(storedTodos);
        setState((previous) => ({ ...previous, todos, isLoading: false }));
      } catch (e) {
        // can't decode todos
        setState((previous) => ({ ...previous, todos: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("todos", JSON.stringify(state.todos));
  }, [state.todos]);

  const handleCreate = useCallback(
    (title: string) => {
      const newTodos = [...state.todos, { id: nanoid(), title, isCompleted: false }];
      setState((previous) => ({ ...previous, todos: newTodos, filter: Filter.All, searchText: "" }));
    },
    [state.todos, setState]
  );

  const handleToggle = useCallback(
    (index: number) => {
      const newTodos = [...state.todos];
      newTodos[index].isCompleted = !newTodos[index].isCompleted;
      setState((previous) => ({ ...previous, todos: newTodos }));
    },
    [state.todos, setState]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newTodos = [...state.todos];
      newTodos.splice(index, 1);
      setState((previous) => ({ ...previous, todos: newTodos }));
    },
    [state.todos, setState]
  );

  const filterTodos = useCallback(() => {
    if (state.filter === Filter.Open) {
      return state.todos.filter((todo) => !todo.isCompleted);
    }
    if (state.filter === Filter.Completed) {
      return state.todos.filter((todo) => todo.isCompleted);
    }
    return state.todos;
  }, [state.todos, state.filter]);

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Todo List"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as Filter }))}
        >
          <List.Dropdown.Item title="All" value={Filter.All} />
          <List.Dropdown.Item title="Open" value={Filter.Open} />
          <List.Dropdown.Item title="Completed" value={Filter.Completed} />
        </List.Dropdown>
      }
      enableFiltering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView filter={state.filter} todos={filterTodos()} searchText={state.searchText} onCreate={handleCreate} />
      {filterTodos().map((todo, index) => (
        <List.Item
          key={todo.id}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ToggleTodoAction todo={todo} onToggle={() => handleToggle(index)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreateTodoAction onCreate={handleCreate} />
                <DeleteTodoAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
