import { getTodos } from "../api";

type Input = {
  /**
   * Which todos to return. Defaults to "open".
   */
  status?: "open" | "closed";
  /**
   * Only return todos on this project. Use the `list-projects` tool to look up
   * the ID from a project name.
   */
  projectId?: string;
  /**
   * Only return todos whose name contains this text.
   */
  search?: string;
};

export default async function tool(input: Input) {
  const todos = await getTodos({
    status: input.status ?? "open",
    projectId: input.projectId,
    search: input.search,
  });

  return todos.map((todo) => ({
    id: todo.id,
    name: todo.name,
    description: todo.description,
    project: todo.project?.title,
    dueDate: todo.dueDate,
    // status 0 = open, 1 = closed
    closed: todo.status === 1,
    progress: todo.progress,
    trackedMinutes: todo.duration ? Math.round(todo.duration / 60) : undefined,
  }));
}
