import {
  List,
  Icon,
  ActionPanel,
  Action,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { getTodos, toggleTodoComplete } from "./utils/vault";
import { TodoDetail } from "./components/TodoDetail";

export default function Command() {
  const [todos, setTodos] = useState(getTodos());

  const pendingTodos = todos.filter((t) => !t.isCompleted);
  const completedTodos = todos.filter((t) => t.isCompleted);

  const handleToggle = async (todoId: string) => {
    try {
      toggleTodoComplete(todoId);
      setTodos(getTodos());
      showToast({ style: Toast.Style.Success, title: "Todo updated" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to update todo" });
    }
  };

  return (
    <List searchBarPlaceholder="Search todos...">
      {todos.length === 0 ? (
        <List.EmptyView icon={Icon.Checkmark} title="No todos" />
      ) : (
        <>
          {pendingTodos.length > 0 && (
            <List.Section title="Pending">
              {pendingTodos.map((t) => (
                <List.Item
                  key={t.id}
                  icon={{ source: Icon.Circle, tintColor: t.color }}
                  title={t.name}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Mark as Done"
                        icon={Icon.Checkmark}
                        onAction={() => handleToggle(t.id)}
                      />
                      <Action.Push
                        title="Show Notes"
                        icon={Icon.Document}
                        target={<TodoDetail todo={t} />}
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {completedTodos.length > 0 && (
            <List.Section title="Completed">
              {completedTodos.map((t) => (
                <List.Item
                  key={t.id}
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  title={t.name}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Mark as Pending"
                        icon={Icon.Circle}
                        onAction={() => handleToggle(t.id)}
                      />
                      <Action.Push
                        title="Show Notes"
                        icon={Icon.Document}
                        target={<TodoDetail todo={t} />}
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                      />
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
