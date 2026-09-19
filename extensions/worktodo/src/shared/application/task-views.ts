import { DomainError, type Label, type Project, type Task } from "../domain/model";
import type { ThisWeekResult, TodayResult } from "../domain/queries";
import type { TaskService } from "../domain/task-service";
import { canonicalizeTimeZone, validateId, validateTimestamp } from "../domain/validation";

export const STATIC_TASK_VIEW_KINDS = ["all", "today", "thisWeek", "completed", "trash"] as const;
export const TASK_VIEW_KINDS = [...STATIC_TASK_VIEW_KINDS, "project", "label"] as const;

export type StaticTaskViewKind = (typeof STATIC_TASK_VIEW_KINDS)[number];
export type TaskViewKind = (typeof TASK_VIEW_KINDS)[number];

type StaticTaskView = {
  [Kind in StaticTaskViewKind]: { kind: Kind };
}[StaticTaskViewKind];

export type TaskView = StaticTaskView | { kind: "project"; projectId: string } | { kind: "label"; labelId: string };

export type TaskViewContext = {
  evaluationInstantMs: number;
  viewerTimeZone: string;
};

type TodayTaskView = Extract<TaskView, { kind: "today" }>;
type ThisWeekTaskView = Extract<TaskView, { kind: "thisWeek" }>;
type OrdinaryTaskView = Exclude<TaskView, TodayTaskView | ThisWeekTaskView>;

type TaskViewResultContext = {
  evaluatedAtMs: number;
  viewerTimeZone: string;
};

export type TodayTaskViewResult = TaskViewResultContext & {
  kind: "today";
  view: TodayTaskView;
  result: TodayResult;
};

export type ThisWeekTaskViewResult = TaskViewResultContext & {
  kind: "thisWeek";
  view: ThisWeekTaskView;
  result: ThisWeekResult;
};

export type OrdinaryTaskViewResult = TaskViewResultContext & {
  kind: "tasks";
  view: OrdinaryTaskView;
  result: Task[];
};

export type TaskViewResult = TodayTaskViewResult | ThisWeekTaskViewResult | OrdinaryTaskViewResult;

export function isStaticTaskViewKind(value: unknown): value is StaticTaskViewKind {
  return typeof value === "string" && STATIC_TASK_VIEW_KINDS.some((kind) => kind === value);
}

export function resolveTaskView(
  kind: TaskViewKind,
  projectId: string | undefined,
  labelId: string | undefined,
): TaskView {
  if (kind === "project") {
    if (!projectId) {
      throw new DomainError("INVALID_ARGUMENT", "The project view requires projectId");
    }
    if (labelId) {
      throw new DomainError("INVALID_ARGUMENT", "labelId is valid only for the label view");
    }
    return { kind, projectId: validateId(projectId) };
  }
  if (kind === "label") {
    if (!labelId) {
      throw new DomainError("INVALID_ARGUMENT", "The label view requires labelId");
    }
    if (projectId) {
      throw new DomainError("INVALID_ARGUMENT", "projectId is valid only for the project view");
    }
    return { kind, labelId: validateId(labelId) };
  }
  if (projectId) {
    throw new DomainError("INVALID_ARGUMENT", "projectId is valid only for the project view");
  }
  if (labelId) {
    throw new DomainError("INVALID_ARGUMENT", "labelId is valid only for the label view");
  }
  return { kind };
}

export function normalizeTaskView(view: TaskView, projects: readonly Project[], labels: readonly Label[]): TaskView {
  if (view.kind === "project") {
    return projects.some((project) => project.id === view.projectId) ? view : { kind: "all" };
  }
  if (view.kind === "label") {
    return labels.some((label) => label.id === view.labelId) ? view : { kind: "all" };
  }
  return view;
}

export function loadTaskView(source: TaskService, view: TodayTaskView, context: TaskViewContext): TodayTaskViewResult;
export function loadTaskView(
  source: TaskService,
  view: ThisWeekTaskView,
  context: TaskViewContext,
): ThisWeekTaskViewResult;
export function loadTaskView(source: TaskService, view: TaskView, context: TaskViewContext): TaskViewResult;
export function loadTaskView(source: TaskService, view: TaskView, context: TaskViewContext): TaskViewResult {
  const evaluatedAtMs = validateTimestamp(context.evaluationInstantMs, "Evaluation instant");
  const viewerTimeZone = canonicalizeTimeZone(context.viewerTimeZone);
  const resultContext = { evaluatedAtMs, viewerTimeZone };

  switch (view.kind) {
    case "today":
      return { kind: "today", view, result: source.listToday(evaluatedAtMs, viewerTimeZone), ...resultContext };
    case "thisWeek":
      return { kind: "thisWeek", view, result: source.listThisWeek(evaluatedAtMs, viewerTimeZone), ...resultContext };
    case "all":
      return { kind: "tasks", view, result: source.listAllTasks(viewerTimeZone), ...resultContext };
    case "project":
      return { kind: "tasks", view, result: source.listProjectTasks(view.projectId), ...resultContext };
    case "label":
      return { kind: "tasks", view, result: source.listLabelTasks(view.labelId), ...resultContext };
    case "completed":
      return { kind: "tasks", view, result: source.listCompleted(), ...resultContext };
    case "trash":
      return { kind: "tasks", view, result: source.listTrash(), ...resultContext };
  }
}

export function tasksInTaskView(result: TaskViewResult): Task[] {
  return result.kind === "tasks" ? result.result : result.result.tasks.map((entry) => entry.task);
}
