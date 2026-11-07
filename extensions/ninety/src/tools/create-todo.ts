import { Tool } from "@raycast/api";
import { createTodo } from "../api/ninety";
import { dateStringToNinetyDate } from "../lib/format";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** The To-Do title. */
  title: string;
  /** Optional details. */
  description?: string;
  /** Due date as YYYY-MM-DD. EOS To-Dos are usually due within 7 days. */
  dueDate?: string;
  /** Team Id from get-teams. Omit for a personal To-Do. */
  teamId?: string;
};

export default async function tool(input: Input) {
  const todo = await createTodo({
    title: input.title,
    description: input.description,
    dueDate: dateStringToNinetyDate(input.dueDate),
    teamId: input.teamId ?? "",
  });
  return {
    id: todo.id,
    title: todo.title,
    dueDate: todo.dueDate,
    teamName: todo.teamName,
    isPersonal: todo.isPersonal,
    url: NinetyUrls.todo({
      id: todo.id,
      isPersonal: todo.isPersonal ?? !input.teamId,
      teamId: todo.teamId ?? input.teamId,
    }),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this To-Do in Ninety?",
  info: [
    { name: "Title", value: input.title },
    { name: "Due", value: input.dueDate },
    { name: "Team", value: input.teamId ? input.teamId : "Personal" },
  ],
});
