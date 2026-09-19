import type { Label, Project, Task } from "../domain/model";
import type { TodayTask } from "../domain/queries";

export type TaskListEntry = {
  task: Task;
  todayStatus?: TodayTask["status"];
};

export type TaskListItem = {
  id: string;
  title: string;
  subtitle: string | undefined;
  keywords: string[];
  accessories: TaskListAccessory[];
  detail: TaskDetailPresentation;
  task: Task;
};

export type TaskListSection = {
  key: string;
  title: string;
  items: TaskListItem[];
};

export type TaskListRowPresentation = {
  title: string;
  accessories: TaskListAccessory[];
  isCompletionAcknowledged: boolean;
};

export type TaskDetailField = {
  title: string;
  text: string;
};

export type TaskDetailPresentation = {
  markdown: string;
  links: string[];
  metadata: TaskDetailField[];
  labels: string[];
};

export type TaskListAccessory = { kind: "text"; text: string } | { kind: "tag"; text: string; style?: "priority" };

type DuePresentation = {
  title: "Due date" | "Overdue" | "Today";
  text: string;
};

function projectLabel(task: Task, projects: Map<string, Project>): string {
  if (task.projectId === null) {
    return "No project";
  }
  return projects.get(task.projectId)?.name ?? task.projectId;
}

function instantLabel(instantMs: number, viewerTimeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: viewerTimeZone,
  }).format(new Date(instantMs));
}

function duePresentation(entry: TaskListEntry, viewerTimeZone: string): DuePresentation {
  const title = entry.todayStatus === "overdue" ? "Overdue" : entry.todayStatus === "dueToday" ? "Today" : "Due date";
  if (entry.task.due.kind === "none") {
    return { title: "Due date", text: "None" };
  }
  if (entry.task.due.kind === "allDay") {
    return { title, text: entry.task.due.date };
  }
  return { title, text: instantLabel(entry.task.due.instantMs, viewerTimeZone) };
}

function lifecycleLabel(
  prefix: "Completed" | "Trashed",
  instantMs: number | null,
  viewerTimeZone: string,
): string | null {
  if (instantMs === null) {
    return null;
  }
  return `${prefix} ${instantLabel(instantMs, viewerTimeZone)}`;
}

function trimUrlCandidate(value: string): string {
  let candidate = value;
  let previous = "";
  while (candidate !== previous) {
    previous = candidate;
    candidate = candidate.replace(/[.,;:!?]+$/u, "");
    const closing = candidate.at(-1);
    const opening = closing === ")" ? "(" : closing === "]" ? "[" : closing === "}" ? "{" : null;
    if (
      opening &&
      [...candidate].filter((character) => character === closing).length >
        [...candidate].filter((character) => character === opening).length
    ) {
      candidate = candidate.slice(0, -1);
    }
  }
  return candidate;
}

export function extractTaskNoteLinks(notes: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  for (const match of notes.matchAll(/\bhttps?:\/\/[^\s<>"']+/giu)) {
    const candidate = trimUrlCandidate(match[0]);
    try {
      const url = new URL(candidate);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.hostname.length === 0 || seen.has(url.href)) {
        continue;
      }
      seen.add(url.href);
      links.push(candidate);
    } catch {
      continue;
    }
  }
  return links;
}

export function taskNotesMarkdown(notes: string): string {
  if (notes.length === 0) {
    return "## Notes\n\n_No notes_";
  }
  const literalNotes = notes.replace(/[!-/:-@[-`{-~]/g, "\\$&").replace(/\n/g, "  \n");
  return `## Notes\n\n${literalNotes}`;
}

export function taskListRowPresentation(
  item: TaskListItem,
  acknowledgedTask: Task | undefined,
): TaskListRowPresentation {
  const isCompletionAcknowledged = acknowledgedTask?.id === item.id && acknowledgedTask.completedAtMs !== null;
  return {
    title: item.title,
    accessories: isCompletionAcknowledged ? [{ kind: "text", text: "Completed" }] : item.accessories,
    isCompletionAcknowledged,
  };
}

function detailPresentation(
  entry: TaskListEntry,
  project: string,
  labelNames: string[],
  viewerTimeZone: string,
): TaskDetailPresentation {
  const due = duePresentation(entry, viewerTimeZone);
  const metadata: TaskDetailField[] = [
    { title: "Project", text: project },
    { title: "Priority", text: entry.task.priority ? "Yes" : "No" },
    due,
    { title: "Created", text: instantLabel(entry.task.createdAtMs, viewerTimeZone) },
    { title: "Updated", text: instantLabel(entry.task.updatedAtMs, viewerTimeZone) },
  ];
  if (entry.task.completedAtMs !== null) {
    metadata.push({ title: "Completed", text: instantLabel(entry.task.completedAtMs, viewerTimeZone) });
  }
  if (entry.task.trashedAtMs !== null) {
    metadata.push({ title: "Trashed", text: instantLabel(entry.task.trashedAtMs, viewerTimeZone) });
  }
  return {
    markdown: taskNotesMarkdown(entry.task.notes),
    links: extractTaskNoteLinks(entry.task.notes),
    metadata,
    labels: labelNames,
  };
}

export function buildTaskListItems(
  entries: readonly TaskListEntry[],
  projects: readonly Project[],
  labels: readonly Label[],
  viewerTimeZone: string,
): TaskListItem[] {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const labelMap = new Map(labels.map((label) => [label.id, label.name]));

  return entries.map((entry) => {
    const project = projectLabel(entry.task, projectMap);
    const labelNames = entry.task.labelIds.flatMap((labelId) => {
      const name = labelMap.get(labelId);
      return name ? [name] : [];
    });
    const labelAccessories: TaskListAccessory[] = labelNames.slice(0, 2).map((text) => ({ kind: "tag", text }));
    const priorityAccessories: TaskListAccessory[] = entry.task.priority
      ? [{ kind: "tag", text: "Priority", style: "priority" }]
      : [];
    if (labelNames.length > 2) {
      labelAccessories.push({ kind: "text", text: `+${labelNames.length - 2}` });
    }
    const due = entry.task.due.kind === "none" ? null : duePresentation(entry, viewerTimeZone);
    const completed = lifecycleLabel("Completed", entry.task.completedAtMs, viewerTimeZone);
    const trashed = lifecycleLabel("Trashed", entry.task.trashedAtMs, viewerTimeZone);
    return {
      id: entry.task.id,
      title: entry.task.title,
      subtitle: entry.task.projectId === null ? undefined : project,
      keywords: [project, entry.task.notes, ...labelNames],
      accessories: [
        ...priorityAccessories,
        ...labelAccessories,
        ...[due ? `${due.title} ${due.text}` : null, completed, trashed]
          .filter((value): value is string => value !== null)
          .map((text): TaskListAccessory => ({ kind: "text", text })),
      ],
      detail: detailPresentation(entry, project, labelNames, viewerTimeZone),
      task: entry.task,
    };
  });
}

export function buildAllTaskListSections(
  tasks: readonly Task[],
  projects: readonly Project[],
  labels: readonly Label[],
  viewerTimeZone: string,
): TaskListSection[] {
  const groups = [
    {
      key: "all:no-project",
      title: "No project",
      tasks: tasks.filter((task) => task.projectId === null),
    },
    ...projects.map((project) => ({
      key: `all:project:${project.id}`,
      title: project.name,
      tasks: tasks.filter((task) => task.projectId === project.id),
    })),
  ];

  return groups
    .filter((group) => group.tasks.length > 0)
    .map((group) => ({
      key: group.key,
      title: group.title,
      items: buildTaskListItems(
        group.tasks.map((task) => ({ task })),
        projects,
        labels,
        viewerTimeZone,
      ),
    }));
}
