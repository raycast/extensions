import { useAtom } from "jotai";
import { todoAtom } from "./atoms";
import { insertIntoSection, compare } from "./utils";
import { TodoSections } from "./atoms";
import { Action, Color, Icon } from "@raycast/api";

const MarkAllIncompleteAction = () => {
  const [todoSections, setTodoItems] = useAtom(todoAtom);
  const handleMarkAllIncomplete = () => {
    // update completed and pinned items
    const updatedPinnedItems = todoSections.pinned.map((item) => ({
      ...item,
      completed: false,
    }));
    // move all items from completed section
    while (todoSections.completed.length != 0) {
      const item = todoSections.completed[0];
      item.completed = false;
      todoSections["todo"] = [...insertIntoSection(todoSections["todo"], item, compare)];
      todoSections["completed"].splice(0, 1);
    }
    const updatedTodoItems = todoSections["todo"];
    const updatedCompletedItems = todoSections["completed"];
    const updatedTodoSections: TodoSections = {
      pinned: updatedPinnedItems,
      todo: updatedTodoItems,
      completed: updatedCompletedItems,
    };
    setTodoItems(updatedTodoSections);
  };
  return (
    <Action
      icon={{ source: Icon.RotateAntiClockwise, tintColor: Color.Magenta }}
      onAction={handleMarkAllIncomplete}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      title="Mark All Incomplete"
    />
  );
};

export default MarkAllIncompleteAction;
