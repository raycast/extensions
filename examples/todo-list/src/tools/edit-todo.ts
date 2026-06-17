import { LocalStorage } from "@raycast/api";
import { Todo } from "../types";

type Input = {
  /**
   * The id of the todo to edit.
   */
  id: string;
  /**
   * The title of the todo to edit.
   */
  title?: string;
  /**
   * Whether the todo is completed.
   */
  isCompleted?: boolean;
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("todos");
  const todos: Todo[] = JSON.parse(data || "[]");

  const todo = todos.find((todo) => todo.id === input.id);
  if (!todo) {
    throw new Error("Todo not found");
  }

  todo.title = input.title ?? todo.title;
  todo.isCompleted = input.isCompleted ?? todo.isCompleted;

  await LocalStorage.setItem("todos", JSON.stringify(todos));

  return todo;
}
