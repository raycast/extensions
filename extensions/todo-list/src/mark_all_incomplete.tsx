import { useAtom } from "jotai";
import { todoAtom } from "./atoms";
import { TodoSections } from "./atoms";
import { Action, Color, Icon } from "@raycast/api";

const MarkAllIncompleteAction = () => {
  const [todoItems, setTodoItems] = useAtom(todoAtom);

  const handleMarkAllIncomplete = () => {
    // update completed and pinned items
    const updatedCompletedItems = todoItems.completed.map((item) => ({
      ...item,
      completed: false,
    }));
    const updatedPinnedItems = todoItems.pinned.map((item) => ({
      ...item,
      completed: false,
    }));
    const updatedTodoItems: TodoSections = {
      pinned: updatedPinnedItems,
      todo: todoItems.todo,
      completed: updatedCompletedItems,
    };
    setTodoItems(updatedTodoItems);
  };
  return (
    <Action
      title="Mark All Incomplete"
      onAction={handleMarkAllIncomplete}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      icon={{ source: Icon.RotateAntiClockwise, tintColor: Color.Magenta }}
    />
  );
};

export default MarkAllIncompleteAction;
