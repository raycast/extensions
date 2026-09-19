import { isStaticTaskViewKind, type TaskView, type TaskViewResult } from "../application/task-views";
import type { Label, Project } from "../domain/model";
import { addCalendarDays, startOfCalendarDate } from "../domain/queries";
import { buildAllTaskListSections, buildTaskListItems, type TaskListEntry, type TaskListSection } from "./task-list";

export type TaskViewContent = {
  title: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
};

const STATIC_VIEW_CONTENT: Record<Exclude<TaskView["kind"], "project" | "label">, TaskViewContent> = {
  all: {
    title: "All tasks",
    searchPlaceholder: "Search tasks",
    emptyTitle: "No tasks yet",
    emptyDescription: "Create a task to get started.",
  },
  today: {
    title: "Today",
    searchPlaceholder: "Search today's tasks",
    emptyTitle: "Nothing due today",
    emptyDescription: "Overdue tasks also appear here.",
  },
  thisWeek: {
    title: "This week",
    searchPlaceholder: "Search this week's tasks",
    emptyTitle: "Nothing due this week",
    emptyDescription: "Overdue tasks also appear here.",
  },
  completed: {
    title: "Completed",
    searchPlaceholder: "Search completed tasks",
    emptyTitle: "No completed tasks",
    emptyDescription: "Completed tasks appear here.",
  },
  trash: {
    title: "Trash",
    searchPlaceholder: "Search trash",
    emptyTitle: "Trash is empty",
    emptyDescription: "Tasks moved to trash appear here.",
  },
};

export function taskViewKey(view: TaskView): string {
  switch (view.kind) {
    case "project":
      return `project:${view.projectId}`;
    case "label":
      return `label:${view.labelId}`;
    default:
      return view.kind;
  }
}

export function taskViewFromKey(value: string, projects: readonly Project[], labels: readonly Label[]): TaskView {
  if (isStaticTaskViewKind(value)) {
    return { kind: value };
  }
  if (value.startsWith("project:")) {
    const projectId = value.slice("project:".length);
    if (projects.some((project) => project.id === projectId)) {
      return { kind: "project", projectId };
    }
  }
  if (value.startsWith("label:")) {
    const labelId = value.slice("label:".length);
    if (labels.some((label) => label.id === labelId)) {
      return { kind: "label", labelId };
    }
  }
  return { kind: "all" };
}

export function taskViewContent(
  view: TaskView,
  projects: readonly Project[],
  labels: readonly Label[],
): TaskViewContent {
  if (view.kind === "project") {
    const title = projects.find((project) => project.id === view.projectId)?.name ?? "Project";
    return {
      title,
      searchPlaceholder: `Search ${title}`,
      emptyTitle: `${title} is empty`,
      emptyDescription: "Create a task in this project.",
    };
  }
  if (view.kind === "label") {
    const title = labels.find((label) => label.id === view.labelId)?.name ?? "Label";
    return {
      title,
      searchPlaceholder: `Search ${title}`,
      emptyTitle: "No tasks with this label",
      emptyDescription: "Create a task or add this label to one.",
    };
  }
  return STATIC_VIEW_CONTENT[view.kind];
}

export function initialProjectIdForTaskView(view: TaskView): string | null {
  return view.kind === "project" ? view.projectId : null;
}

function laterThisWeekSectionTitle(date: string, localDate: string, viewerTimeZone: string): string {
  if (date === addCalendarDays(localDate, 1)) {
    return "Tomorrow";
  }
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: viewerTimeZone,
  };
  if (date.slice(0, 4) !== localDate.slice(0, 4)) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat(undefined, options).format(new Date(startOfCalendarDate(date, viewerTimeZone)));
}

export function buildTaskViewSections(
  taskView: TaskViewResult,
  projects: readonly Project[],
  labels: readonly Label[],
): TaskListSection[] {
  if (taskView.kind === "today") {
    return [
      {
        key: "today",
        title: taskViewContent(taskView.view, projects, labels).title,
        items: buildTaskListItems(
          taskView.result.tasks.map(({ task, status }) => ({ task, todayStatus: status })),
          projects,
          labels,
          taskView.viewerTimeZone,
        ),
      },
    ];
  }

  if (taskView.kind === "thisWeek") {
    const groups = new Map<string, { title: string; entries: TaskListEntry[] }>();
    for (const { task, status, localDate } of taskView.result.tasks) {
      const groupKey = status === "overdue" ? "overdue" : status === "dueToday" ? "today" : localDate;
      const group = groups.get(groupKey) ?? {
        title:
          status === "overdue"
            ? "Overdue"
            : status === "dueToday"
              ? "Today"
              : laterThisWeekSectionTitle(localDate, taskView.result.localDate, taskView.viewerTimeZone),
        entries: [],
      };
      group.entries.push(status === "laterThisWeek" ? { task } : { task, todayStatus: status });
      groups.set(groupKey, group);
    }
    return [...groups].map(([key, group]) => ({
      key: `thisWeek:${key}`,
      title: group.title,
      items: buildTaskListItems(group.entries, projects, labels, taskView.viewerTimeZone),
    }));
  }

  if (taskView.view.kind === "all") {
    return buildAllTaskListSections(taskView.result, projects, labels, taskView.viewerTimeZone);
  }

  return [
    {
      key: taskViewKey(taskView.view),
      title: taskViewContent(taskView.view, projects, labels).title,
      items: buildTaskListItems(
        taskView.result.map((task) => ({ task })),
        projects,
        labels,
        taskView.viewerTimeZone,
      ),
    },
  ];
}

export type { TaskListSection } from "./task-list";
