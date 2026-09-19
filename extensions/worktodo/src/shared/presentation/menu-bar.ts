import type { Project, Task } from "../domain/model";
import { addCalendarDays, type ThisWeekResult, type ThisWeekTask } from "../domain/queries";
import type { TaskLifecycleHistoryState } from "../application/task-lifecycle-interaction";
import { taskLifecycleHistoryTitle } from "./task-lifecycle";

const MENU_BAR_TASK_LABEL_MAX_GRAPHEMES = 72;
const MENU_BAR_DUE_SEPARATOR = " · ";
const MENU_BAR_HISTORY_TITLE_GAP_GRAPHEMES = 1;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export type MenuBarTask = {
  id: string;
  title: string;
  priority: boolean;
  projectName: string | null;
  dueLabel: string | null;
  view: "thisWeek";
};

export type MenuBarTaskSection = {
  key: "priority" | "overdue" | "today" | "tomorrow" | "laterThisWeek";
  title: "Priority" | "Overdue" | "Today" | "Tomorrow" | "Later this week";
  tasks: MenuBarTask[];
};

export type MenuBarModel = {
  count: number;
  title: string | undefined;
  sections: MenuBarTaskSection[];
};

export type MenuBarVisibility = {
  hidden: boolean;
  clearStoredHidden: boolean;
};

export type MenuBarTaskHistoryItem = {
  direction: TaskLifecycleHistoryState["direction"];
  title: string;
  subtitle: string;
};

export function buildMenuBarTaskHistoryItem(state: TaskLifecycleHistoryState): MenuBarTaskHistoryItem {
  const title = taskLifecycleHistoryTitle(state);
  const subtitleMaximum =
    MENU_BAR_TASK_LABEL_MAX_GRAPHEMES - graphemes(title).length - MENU_BAR_HISTORY_TITLE_GAP_GRAPHEMES;
  return {
    direction: state.direction,
    title,
    subtitle: truncateGraphemes(state.taskTitle, subtitleMaximum),
  };
}

export function resolveMenuBarVisibility(storedHidden: boolean, userInitiated: boolean): MenuBarVisibility {
  return {
    hidden: storedHidden && !userInitiated,
    clearStoredHidden: storedHidden && userInitiated,
  };
}

function menuBarTask(task: Task, projects: ReadonlyMap<string, Project>, dueLabel: string | null): MenuBarTask {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectName: task.projectId === null ? null : (projects.get(task.projectId)?.name ?? null),
    dueLabel,
    view: "thisWeek",
  };
}

function priorityDueLabel(entry: ThisWeekTask, tomorrowDate: string): string {
  if (entry.status === "overdue") {
    return "Overdue";
  }
  if (entry.status === "dueToday") {
    return "Today";
  }
  if (entry.localDate === tomorrowDate) {
    return "Tomorrow";
  }
  return WEEKDAY_LABELS[new Date(`${entry.localDate}T00:00:00.000Z`).getUTCDay()];
}

function graphemes(value: string): string[] {
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
}

function truncateGraphemes(value: string, maximum: number): string {
  const segments = graphemes(value);
  if (segments.length <= maximum) {
    return value;
  }
  return `${segments.slice(0, maximum - 1).join("")}…`;
}

export function menuBarTaskTitle(task: MenuBarTask): string {
  const dueSuffix = task.dueLabel === null ? "" : `${MENU_BAR_DUE_SEPARATOR}${task.dueLabel}`;
  const taskTitleMaximum = MENU_BAR_TASK_LABEL_MAX_GRAPHEMES - graphemes(dueSuffix).length;
  return `${truncateGraphemes(task.title, taskTitleMaximum)}${dueSuffix}`;
}

export function buildMenuBarModel(thisWeekResult: ThisWeekResult, projects: readonly Project[]): MenuBarModel {
  const priority: MenuBarTask[] = [];
  const overdue: MenuBarTask[] = [];
  const today: MenuBarTask[] = [];
  const tomorrow: MenuBarTask[] = [];
  const laterThisWeek: MenuBarTask[] = [];
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const tomorrowDate = addCalendarDays(thisWeekResult.localDate, 1);
  let count = 0;
  for (const entry of thisWeekResult.tasks) {
    const { task, status, localDate } = entry;
    if (status === "overdue" || status === "dueToday") {
      count += 1;
    }
    const item = menuBarTask(task, projectMap, task.priority ? priorityDueLabel(entry, tomorrowDate) : null);
    if (task.priority) {
      priority.push(item);
      continue;
    }
    if (status === "overdue") {
      overdue.push(item);
    } else if (status === "dueToday") {
      today.push(item);
    } else if (localDate === tomorrowDate) {
      tomorrow.push(item);
    } else {
      laterThisWeek.push(item);
    }
  }

  const sections: MenuBarTaskSection[] = [];
  if (priority.length > 0) {
    sections.push({ key: "priority", title: "Priority", tasks: priority });
  }
  if (overdue.length > 0) {
    sections.push({ key: "overdue", title: "Overdue", tasks: overdue });
  }
  if (today.length > 0) {
    sections.push({ key: "today", title: "Today", tasks: today });
  }
  if (tomorrow.length > 0) {
    sections.push({ key: "tomorrow", title: "Tomorrow", tasks: tomorrow });
  }
  if (laterThisWeek.length > 0) {
    sections.push({ key: "laterThisWeek", title: "Later this week", tasks: laterThisWeek });
  }
  return { count, title: count === 0 ? undefined : String(count), sections };
}
