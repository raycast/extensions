import { Action, Icon } from "@raycast/api";
import { Password } from "../types";

function ToggleTodoAction(props: { todo: Password; onToggle: () => void }) {
  return (
    <Action
      icon={props.todo.isCompleted ? Icon.Circle : Icon.Checkmark}
      title={props.todo.isCompleted ? "Uncomplete Todo" : "Complete Todo"}
      onAction={props.onToggle}
    />
  );
}

export default ToggleTodoAction;
