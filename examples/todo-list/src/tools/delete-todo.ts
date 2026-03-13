import { Action, LocalStorage } from "@raycast/api";
import { Todo } from "../types";

type Input = {
  /**
   * The id of the todo to delete.
   */
  id: string;
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("todos");
  const todos: Todo[] = JSON.parse(data || "[]");

  const todo = todos.find((todo) => todo.id === input.id);
  if (!todo) {
    throw new Error("Todo not found");
  }

  todos.splice(todos.indexOf(todo), 1);
  await LocalStorage.setItem("todos", JSON.stringify(todos));

  return todo;
}

export async function confirmation(input: Input) {
  const data = await LocalStorage.getItem<string>("todos");
  const todos: Todo[] = JSON.parse(data || "[]");

  const todo = todos.find((todo) => todo.id === input.id);
  if (!todo) {
    throw new Error("Todo not found");
  }

  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete the todo?",
    info: [
      { name: "Title", value: todo.title },
      { name: "Status", value: todo.isCompleted ? "Completed" : "Open" },
    ],
  };
}
