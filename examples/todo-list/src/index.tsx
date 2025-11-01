import { useState } from "react";
import { nanoid } from "nanoid";
import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Filter, Todo } from "./types";
import { CreateTodoAction, DeleteTodoAction, EmptyView, ToggleTodoAction } from "./components";

type State = {
  filter: Filter;
  searchText: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: Filter.All,
    searchText: "",
  });
  const { value: todos, setValue: setTodos, isLoading } = useLocalStorage<Todo[]>("todos");

  const handleCreate = (title: string) => {
    setTodos([...(todos ?? []), { id: nanoid(), title, isCompleted: false }]);
    setState((previous) => ({
      ...previous,
      filter: Filter.All,
      searchText: "",
    }));
  };

  const filteredTodos = (() => {
    if (state.filter === Filter.Open) {
      return todos?.filter((todo) => !todo.isCompleted) ?? [];
    }
    if (state.filter === Filter.Completed) {
      return todos?.filter((todo) => todo.isCompleted) ?? [];
    }
    return todos ?? [];
  })();

  return (
    <List
      isLoading={isLoading}
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Todo List"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as Filter }))}
        >
          <List.Dropdown.Item title="All" value={Filter.All} icon={Icon.CircleDisabled} />
          <List.Dropdown.Item title="Open" value={Filter.Open} icon={Icon.Circle} />
          <List.Dropdown.Item title="Completed" value={Filter.Completed} icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
      filtering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView filter={state.filter} todos={filteredTodos} searchText={state.searchText} onCreate={handleCreate} />
      {filteredTodos.map((todo, index) => (
        <List.Item
          key={todo.id}
          icon={todo.isCompleted ? Icon.CheckCircle : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ToggleTodoAction
                  todo={todo}
                  onToggle={() =>
                    setTodos(
                      todos?.map((todo, i) => {
                        if (i === index) {
                          return { ...todo, isCompleted: !todo.isCompleted };
                        }
                        return todo;
                      }) ?? [],
                    )
                  }
                />
                <Action.CopyToClipboard content={todo.title} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreateTodoAction defaultTitle={state.searchText} onCreate={handleCreate} />
                <DeleteTodoAction onDelete={() => setTodos(todos?.filter((_, i) => i !== index) ?? [])} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
