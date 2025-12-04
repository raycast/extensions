import { LocalStorage } from "@raycast/api";
import { Todo } from "../types";
import { nanoid } from "nanoid";

type Input = {
  /**
   * The title of the todo to create.
   */
  title: string;
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("todos");
  const todos: Todo[] = JSON.parse(data || "[]");

  const newTodo = { id: nanoid(), title: input.title, isCompleted: false };
  todos.push(newTodo);

  await LocalStorage.setItem("todos", JSON.stringify(todos));

  return newTodo;
}
