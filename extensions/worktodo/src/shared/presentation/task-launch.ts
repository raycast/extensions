import { isStaticTaskViewKind, type StaticTaskViewKind } from "../application/task-views";

export type MyTasksLaunchContext = {
  view?: StaticTaskViewKind;
  selectedTaskId?: string;
  createTask?: boolean;
  editTask?: boolean;
};

export type ParsedMyTasksLaunchContext = {
  view: StaticTaskViewKind;
  selectedTaskId: string | undefined;
  createTask: boolean;
  editTask: boolean;
  isShowingDetail: boolean;
};

export function parseMyTasksLaunchContext(value: unknown): ParsedMyTasksLaunchContext {
  const context = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const view = context.view;
  const selectedTaskId =
    typeof context.selectedTaskId === "string" && context.selectedTaskId.trim().length > 0
      ? context.selectedTaskId
      : undefined;
  const createTask = context.createTask === true;

  return {
    view: isStaticTaskViewKind(view) ? view : "all",
    selectedTaskId,
    createTask,
    editTask: context.editTask === true && selectedTaskId !== undefined && !createTask,
    isShowingDetail: selectedTaskId !== undefined,
  };
}

export type { StaticTaskViewKind } from "../application/task-views";
