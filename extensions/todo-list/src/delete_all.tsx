import { useAtom } from "jotai";
import { todoAtom } from "./atoms";
import { DEFAULT_SECTIONS } from "./config";
import { ActionPanel, Color, Icon } from "@raycast/api";
import _ from "lodash";

const DeleteAllAction = () => {
  const [, setTodoItems] = useAtom(todoAtom);
  return (
    <ActionPanel.Item
      title="Delete All Todos"
      onAction={() => setTodoItems(_.cloneDeep(DEFAULT_SECTIONS))}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
    />
  );
};

export default DeleteAllAction;
