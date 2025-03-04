import { Action, Icon } from "@raycast/api";
import { Todo } from "../types";

export function ToggleTodoAction(props: { todo: Todo; onToggle: () => void }) {
  return (
    <Action
      icon={props.todo.isCompleted ? Icon.Circle : Icon.Checkmark}
      title={props.todo.isCompleted ? "Mark as Uncompleted" : "Mark as Completed"}
      onAction={props.onToggle}
    />
  );
}
