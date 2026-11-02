import { Tool } from "@raycast/api";
import { updateTodo } from "../api/ninety";

type Input = {
  /** The To-Do Id (from get-my-todos). */
  todoId: string;
  /** The To-Do title, shown in the confirmation. */
  title?: string;
  /** false to reopen a completed To-Do. Defaults to true. */
  completed?: boolean;
};

export default async function tool({ todoId, completed = true }: Input) {
  const todo = await updateTodo(todoId, { completed });
  return { id: todo.id, title: todo.title, completed: todo.completed };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.completed === false ? "Reopen this To-Do?" : "Mark this To-Do complete?",
  info: [{ name: "To-Do", value: input.title ?? input.todoId }],
});
