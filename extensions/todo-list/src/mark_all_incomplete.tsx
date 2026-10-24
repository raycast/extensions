import { shortcut } from "./shortcuts";
import { useAtom } from "jotai";
import { todoAtom } from "./atoms";
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
    const updatedTodoSections: TodoSections = {
      pinned: updatedPinnedItems,
      todo: [...todoSections.todo, ...todoSections.completed.map((item) => ({ ...item, completed: false }))],
      completed: [],
    };
    setTodoItems(updatedTodoSections);
  };
  return (
    <Action
      icon={{ source: Icon.RotateAntiClockwise, tintColor: Color.Magenta }}
      onAction={handleMarkAllIncomplete}
      shortcut={shortcut("r", ["cmd"])}
      title="Mark All Incomplete"
    />
  );
};

export default MarkAllIncompleteAction;
