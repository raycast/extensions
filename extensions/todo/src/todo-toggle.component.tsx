import {Action, Icon} from "@raycast/api";
import {Todo} from "./todo";

export function ToggleTodoAction(props: { todo: Todo; onToggle: () => void }) {
  return (
    <Action
      icon={props.todo.isCompleted ? Icon.Circle : Icon.Checkmark}
      title={props.todo.isCompleted ? "Uncomplete To-do" : "Complete To-do"}
      onAction={props.onToggle}
    />
  );
}
