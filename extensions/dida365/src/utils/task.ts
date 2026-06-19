import { Color, Icon } from "@raycast/api";
import type { ChecklistItem, Task, TaskPriority } from "../types.js";

export function priorityLabel(priority?: TaskPriority): string {
  switch (priority) {
    case 5:
      return "High";
    case 3:
      return "Medium";
    case 1:
      return "Low";
    default:
      return "None";
  }
}

export function priorityAccessory(priority?: TaskPriority) {
  switch (priority) {
    case 5:
      return {
        tag: { value: "High", color: Color.Red },
        icon: Icon.ExclamationMark,
      };
    case 3:
      return { tag: { value: "Medium", color: Color.Orange } };
    case 1:
      return { tag: { value: "Low", color: Color.Blue } };
    default:
      return undefined;
  }
}

export function taskSearchText(task: Task): string {
  return [
    task.title,
    task.content,
    task.desc,
    task.dueDate,
    task.projectName,
    ...(task.items?.map((item) => item.title) ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function filterTasksBySearch(tasks: Task[], searchText: string): Task[] {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return tasks;
  }

  return tasks.filter((task) => taskSearchText(task).toLowerCase().includes(query));
}

export function openTasksOnly(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status !== 2);
}

export function isChecklistItemCompleted(item: ChecklistItem): boolean {
  return item.status === 2;
}

export type TaskGroup = {
  key: string;
  title: string;
  tasks: Task[];
};

export function groupTasksByProject(tasks: Task[]): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();

  for (const task of tasks) {
    const title = projectSectionTitle(task);
    const key = task.projectId || title;
    const group = groups.get(key);

    if (group) {
      group.tasks.push(task);
    } else {
      groups.set(key, { key, title, tasks: [task] });
    }
  }

  return [...groups.values()].sort(compareTaskGroups);
}

function projectSectionTitle(task: Task): string {
  const projectName = task.projectName?.trim();

  if (!projectName || isInboxProject(projectName)) {
    return "Inbox";
  }

  return projectName;
}

function isInboxProject(projectName: string): boolean {
  return ["inbox", "收集箱", "收件箱"].includes(projectName.toLowerCase());
}

function compareTaskGroups(a: TaskGroup, b: TaskGroup): number {
  const aIndex = preferredSectionOrder(a.title);
  const bIndex = preferredSectionOrder(b.title);

  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }

  return a.title.localeCompare(b.title, "zh-Hans-CN");
}

function preferredSectionOrder(title: string): number {
  switch (title) {
    case "Inbox":
      return 0;
    case "个人备忘":
      return 1;
    case "学习安排":
      return 2;
    default:
      return 10;
  }
}
