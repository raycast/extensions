import { Tool } from "@raycast/api";
import { closeTodo, getTodo } from "../api";

type Input = {
  /**
   * The ID of the todo to mark as done. Use the `list-todos` tool to look up
   * the ID from a todo name.
   */
  todoId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const todo = await getTodo(input.todoId);

  return {
    message: `Mark "${todo.name}" as done?`,
    info: [
      { name: "Todo", value: todo.name },
      { name: "Project", value: todo.project?.title },
    ],
  };
};

export default async function tool(input: Input) {
  const todo = await closeTodo(input.todoId);

  return {
    id: todo.id,
    name: todo.name,
    project: todo.project?.title,
    // status 0 = open, 1 = closed
    closed: todo.status === 1,
  };
}
