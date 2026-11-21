import {
  formatDurationHuman,
  getProject,
  getTodo,
  type Project,
  type Todo,
} from "./api";
import { parseUri } from "./mentions";

type Input = {
  /** The `uri` of an item a mention search returned. */
  uri: string;
};

function line(label: string, value: string | number | undefined): string {
  return value === undefined || value === "" ? "" : `- ${label}: ${value}\n`;
}

function projectMarkdown(project: Project): string {
  return (
    `# Project: ${project.title}\n\n` +
    line("Project ID", project.id) +
    line("Client", project.employer) +
    line("Team", project.team?.name) +
    line("Status", project.archived ? "archived" : "active") +
    line("Open todos", project.todoCount) +
    line("Link", `https://my.timesheet.io/projects/show/${project.id}`) +
    (project.description ? `\n${project.description}\n` : "")
  );
}

function todoMarkdown(todo: Todo): string {
  const estimateMinutes =
    (todo.estimatedHours ?? 0) * 60 + (todo.estimatedMinutes ?? 0);
  return (
    `# Todo: ${todo.name}\n\n` +
    line("Todo ID", todo.id) +
    line("Project", todo.project?.title) +
    line("Project ID", todo.project?.id) +
    // status 0 = open, 1 = closed
    line("Status", todo.status === 1 ? "closed" : "open") +
    line("Due", todo.dueDate) +
    line(
      "Estimate",
      estimateMinutes > 0
        ? formatDurationHuman(estimateMinutes * 60000)
        : undefined,
    ) +
    // todo.duration is in seconds
    line(
      "Tracked",
      todo.duration ? formatDurationHuman(todo.duration * 1000) : undefined,
    ) +
    line(
      "Progress",
      typeof todo.progress === "number"
        ? `${Math.round(todo.progress)}%`
        : undefined,
    ) +
    line("Link", `https://my.timesheet.io/todos/show/${todo.id}`) +
    (todo.description ? `\n${todo.description}\n` : "")
  );
}

/** Resource provider: the content of an item mentioned from the AI Chat `@` menu. */
export default async function (input: Input): Promise<string> {
  const parsed = parseUri(input.uri);
  if (!parsed) {
    throw new Error(`Not a Timesheet item: ${input.uri}`);
  }
  return parsed.kind === "project"
    ? projectMarkdown(await getProject(parsed.id))
    : todoMarkdown(await getTodo(parsed.id));
}
