import {Action, Icon} from "@raycast/api";
import {Todo} from "./todo";
import {TodoForm} from "./todo-form.component";

export function CreateTodoAction(props: {
  onCreate: (todo: Todo) => void,
  defaultTitle?: string
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create To-do"
      shortcut={{modifiers: ["cmd"], key: "n"}}
      target={
        <TodoForm onCreate={props.onCreate}
                  defaultTitle={props.defaultTitle}/>
      }
    />
  );
}

export function CreateTopPriorityTodoAction(props: { onCreate: (todo: Todo) => void, defaultTitle?: string }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Top Priority Todo"
      shortcut={{modifiers: ["cmd", "shift"], key: "n"}}
      target={
        <TodoForm onCreate={props.onCreate}
                  defaultTitle={props.defaultTitle}
                  topPriority={true}/>
      }
    />
  );
}

