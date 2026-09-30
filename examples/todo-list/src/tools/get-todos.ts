import { LocalStorage } from "@raycast/api";
import { Todo } from "../types";

type Input = {
  /**
   * The status of the todos to get.
   * @default "all"
   */
  status: "all" | "open" | "completed";
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("todos");
  const todos: Todo[] = JSON.parse(data || "[]");
  if (input.status === "all") {
    return todos;
  }
  return todos.filter((todo) => todo.isCompleted === (input.status === "completed"));
}
