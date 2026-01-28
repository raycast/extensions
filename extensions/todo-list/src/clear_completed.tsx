import { useAtom } from "jotai";
import { TodoSections, todoAtom } from "./atoms";
import { Action, Alert, Color, Icon, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useMemo } from "react";

const ClearCompletedAction = () => {
  const [todoSections, setTodoItems] = useAtom(todoAtom);
  const hasCompletedTodo = useMemo(() => {
    return todoSections["completed"].length > 0 || todoSections["pinned"].filter((item) => item.completed).length > 0;
  }, [todoSections]);

  const handleClearCompleted = useCallback(async () => {
    // if there is no completed todo, do nothing
    if (hasCompletedTodo) {
      await confirmAlert({
        title: "Clear Completed Todos",
        icon: { source: Icon.Trash, tintColor: Color.Red },
        message: "Are you sure you want to delete all todos?",
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Clear completed",
          onAction: () => {
            // Clear completed section
            // and clear completed pinned todos as well
            const updatedPinnedItems = todoSections.pinned.filter((item) => !item.completed);
            const updatedTodoSections: TodoSections = {
              pinned: updatedPinnedItems,
              todo: todoSections["todo"],
              completed: [],
            };
            setTodoItems(updatedTodoSections);
            showToast({ title: "Success", message: "Successfully cleared completed items" });
          },
        },
      });
      return;
    }

    showToast({ title: "Info", message: "No completed items to clear" });
  }, [hasCompletedTodo, setTodoItems, todoSections]);

  return (
    <Action
      icon={{ source: Icon.Trash, tintColor: hasCompletedTodo ? Color.Red : undefined }}
      onAction={handleClearCompleted}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      style={hasCompletedTodo ? Action.Style.Destructive : undefined}
      title="Clear Completed Todos"
    />
  );
};

export default ClearCompletedAction;
