import { CreateTaskValues } from "./TaskPayload";

type UnknownValues = Record<string, unknown> | undefined;

export interface ParentTaskCandidate {
  id: string;
  projectId: string;
  parentId?: string;
  typeOfWorkId?: string;
}

const unwrapValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return value;

  const wrappedValue = value as Record<string, unknown>;
  return wrappedValue.value ?? wrappedValue.id ?? value;
};

export const normalizeFormString = (value: unknown, fallback?: string): string | undefined => {
  const unwrapped = unwrapValue(value);
  return typeof unwrapped === "string" ? unwrapped : fallback;
};

const normalizeDate = (value: unknown): Date | null | undefined => {
  const unwrapped = unwrapValue(value);
  if (unwrapped === null) return null;
  if (unwrapped instanceof Date) return Number.isNaN(unwrapped.getTime()) ? undefined : unwrapped;
  if (typeof unwrapped !== "string" && typeof unwrapped !== "number") return undefined;

  const date = new Date(unwrapped);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => normalizeFormString(item)).filter((item): item is string => Boolean(item));
};

export const normalizeCreateTaskDraftValues = (draftValues: UnknownValues): Partial<CreateTaskValues> => {
  if (!draftValues) return {};

  const projectId = normalizeFormString(draftValues.projectId, "none");
  const normalized: Partial<CreateTaskValues> = {
    name: normalizeFormString(draftValues.name),
    projectId: projectId === "private" ? "none" : projectId,
    parentTaskId: normalizeFormString(draftValues.parentTaskId, "none"),
    description: normalizeFormString(draftValues.description),
    taskStatusId: normalizeFormString(draftValues.taskStatusId, "none"),
    typeOfWorkId: normalizeFormString(draftValues.typeOfWorkId, "none"),
    taskListId: normalizeFormString(draftValues.taskListId, "none"),
    assigneeIds: normalizeStringArray(draftValues.assigneeIds) ?? [],
    startOn: normalizeDate(draftValues.startOn),
    dueOn: normalizeDate(draftValues.dueOn),
    plannedDuration: normalizeFormString(draftValues.plannedDuration),
    isPrio: typeof draftValues.isPrio === "boolean" ? draftValues.isPrio : false,
  };

  if (normalized.projectId === "none") {
    normalized.parentTaskId = "none";
    normalized.taskListId = "none";
    normalized.assigneeIds = [];
  }

  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined));
};

export const getSelectableParentTasks = <T extends ParentTaskCandidate>(tasks: T[] | undefined): T[] =>
  tasks?.filter((task) => !task.parentId) ?? [];

export const findSelectableParentTask = <T extends ParentTaskCandidate>(
  tasks: T[] | undefined,
  parentTaskId: string | undefined,
  projectId: string,
): T | undefined =>
  getSelectableParentTasks(tasks).find((task) => task.id === parentTaskId && task.projectId === projectId);
