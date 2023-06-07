import {Action, Keyboard} from "@raycast/api";
import {Todo} from "./todo";
import {gray_todo_icons, todo_icons} from "./constants";

export function TogglePriority(props: { todo: Todo; onToggle: () => void, priority_type: "important" | "urgent" | "quick" }) {
  const key = props.priority_type
  const icon = props.todo[key] ? gray_todo_icons[key] : todo_icons[key]
  const title = props.todo[key] ? `Mark not ${key}` : `Mark ${key}`
  const shortcut = {
    modifiers: ["cmd"] as Keyboard.KeyModifier[],
    key: key[0] as Keyboard.KeyEquivalent
  }
  return (
    <Action
      icon={icon}
      title={title}
      shortcut={shortcut}
      onAction={props.onToggle}
    />
  );
}