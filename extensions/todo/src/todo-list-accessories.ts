import {Todo} from "./todo";
import {gray_todo_icons, todo_icons} from "./constants";

export function GetAccessories(todo: Todo) {
  return [
    {
      icon: todo.urgent ? todo_icons.urgent : gray_todo_icons.urgent,
      tooltip: "cmd+u | Urgent"
    },
    {
      icon: todo.important ? todo_icons.important : gray_todo_icons.important,
      tooltip: "cmd+i | Important"
    },
    {
      icon: todo.quick ? todo_icons.quick : gray_todo_icons.quick,
      tooltip: "cmd+q | Quick"
    },
  ]
}