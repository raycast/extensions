import { Action, Icon } from "@raycast/api";
import { Todo } from "../types";
import CreateTodoForm from "./CreateTodoForm";

function CreateTodoAction(props: { defaultTitle?: string; onCreate: (title: string) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Todo"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateTodoForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}

export default CreateTodoAction;
