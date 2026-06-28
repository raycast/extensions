import { useAtom } from "jotai";
import { todoAtom } from "./atoms";
import { DEFAULT_SECTIONS } from "./config";
import { Action, Alert, Color, Icon, confirmAlert, showToast } from "@raycast/api";
import _ from "lodash";

const DeleteAllAction = () => {
  const [, setTodoItems] = useAtom(todoAtom);
  return (
    <Action
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      onAction={async () => {
        await confirmAlert({
          title: "Delete All Todos",
          icon: { source: Icon.Trash, tintColor: Color.Red },
          message: "Are you sure you want to delete all todos?",
          primaryAction: {
            style: Alert.ActionStyle.Destructive,
            title: "Delete all",
            onAction: () => {
              setTodoItems(_.cloneDeep(DEFAULT_SECTIONS));
              showToast({ title: "Success", message: "Successfully deleted all todos" });
            },
          },
        });
      }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      style={Action.Style.Destructive}
      title="Delete All Todos"
    />
  );
};

export default DeleteAllAction;
