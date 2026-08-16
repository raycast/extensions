import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { TaskViewQuery } from "./viewQuery";

function matchesStatus(task: Task, status: TaskViewQuery["status"]): boolean {
  return status === "all" || task.status === status;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u03c2/g, "\u03c3")
    .replace(/\u00df/g, "ss")
    .normalize("NFKC");
}

export function selectInbox(tasks: Task[], projects: Project[], status: TaskViewQuery["status"]): Task[] {
  const inbox = projects.find((project) => project.kind === "inbox");
  if (!inbox) return [];

  return tasks.filter((task) => task.projectId === inbox.id && matchesStatus(task, status));
}

export function searchTasks(tasks: Task[], query: TaskViewQuery): Task[] {
  const searchText = query.searchText ? normalizeSearchText(query.searchText.trim()) : undefined;

  return tasks.filter((task) => {
    if (!matchesStatus(task, query.status)) return false;
    if (query.projectId && task.projectId !== query.projectId) return false;
    if (!searchText) return true;

    return [task.title, task.content, task.description, task.projectName, ...task.tags].some((value) =>
      value ? normalizeSearchText(value).includes(searchText) : false
    );
  });
}
