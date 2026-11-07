import { getMyTodos, getTeamTodos } from "../api/ninety";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Optional Team Id (from get-teams). Omit to get the user's own To-Dos, personal and team. */
  teamId?: string;
  /** Set to true to return completed To-Dos instead of open ones. */
  completed?: boolean;
};

export default async function tool({ teamId, completed }: Input) {
  const todos = teamId ? await getTeamTodos(teamId, { completed }) : await getMyTodos({ completed });
  return todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    description: todo.description,
    dueDate: todo.dueDate,
    completed: todo.completed,
    isPersonal: todo.isPersonal,
    teamName: todo.teamName,
    ownerUserId: todo.userId,
    url: NinetyUrls.todo(todo),
  }));
}
