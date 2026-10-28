import { CreateTaskValues } from "./TaskPayload";
import { validateDuration } from "./ValidateDuration";
import type { task } from "./FetchData";

export interface CreateTaskToolData {
  name: string;
  isPrivate?: boolean;
  projectId?: string;
  parentTaskId?: string;
  description?: string;
  taskStatusId?: string;
  typeOfWorkId?: string;
  taskListId?: string;
  assigneeIds?: string[];
  startOn?: string;
  dueOn?: string;
  plannedDuration?: string;
  isPrio?: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const optionalUuid = (value: string | undefined, field: string) => {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!uuidPattern.test(normalized)) throw new Error(`${field} must be an awork UUID, not a name`);
  return normalized;
};

export const requireAworkUuid = (value: string | undefined, field: string): string => {
  const uuid = optionalUuid(value, field);
  if (!uuid) throw new Error(`${field} is required`);
  return uuid;
};

export const parseTaskToolDate = (value: string | undefined, field: string): Date | null => {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`${field} must use YYYY-MM-DD`);

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    throw new Error(`${field} is not a valid calendar date`);
  }

  return parsed;
};

export const parseTaskToolAssigneeIds = (value: string | undefined): string[] =>
  value
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

export const validateParentTask = (
  parentTask: Pick<task, "id" | "projectId" | "parentId" | "typeOfWorkId"> | undefined,
  projectId: string,
  parentTaskId: string,
) => {
  if (!parentTask || parentTask.id !== parentTaskId) {
    throw new Error("The parent task was not found in the selected project");
  }
  if (parentTask.projectId !== projectId) {
    throw new Error("The parent task must be in the same project as the new task");
  }
  if (parentTask.parentId) {
    throw new Error("A subtask cannot be used as the parent of another subtask");
  }

  return parentTask;
};

export const buildCreateTaskToolValues = (input: CreateTaskToolData): CreateTaskValues => {
  const name = input.name?.trim();
  if (!name) throw new Error("name is required");
  if (name.length > 1000) throw new Error("name can contain at most 1,000 characters");

  const description = input.description?.trim();
  if (description && description.length > 25000) {
    throw new Error("description can contain at most 25,000 characters");
  }

  const projectId = optionalUuid(input.projectId, "projectId");
  if (input.isPrivate && projectId) throw new Error("A private task cannot have a projectId");
  if (!input.isPrivate && !projectId) {
    throw new Error("projectId is required unless the user explicitly requested a private task with isPrivate=true");
  }

  const parentTaskId = optionalUuid(input.parentTaskId, "parentTaskId");
  const taskListId = optionalUuid(input.taskListId, "taskListId");
  const taskStatusId = optionalUuid(input.taskStatusId, "taskStatusId");
  const typeOfWorkId = optionalUuid(input.typeOfWorkId, "typeOfWorkId");
  const assigneeIds = [
    ...new Set(
      (input.assigneeIds ?? []).map((id) => {
        const assigneeId = optionalUuid(id, "assigneeIds");
        if (!assigneeId) throw new Error("assigneeIds must contain awork UUIDs");
        return assigneeId;
      }),
    ),
  ];

  if (input.isPrivate && (parentTaskId || taskListId || assigneeIds.length > 0)) {
    throw new Error("Private tasks cannot have a parent task, task list, or assignees");
  }

  const startOn = parseTaskToolDate(input.startOn, "startOn");
  const explicitDueOn = parseTaskToolDate(input.dueOn, "dueOn");
  const dueOn = explicitDueOn ?? (startOn ? new Date(startOn) : null);
  if (startOn && dueOn && dueOn < startOn) throw new Error("dueOn cannot be before startOn");

  const plannedDuration = input.plannedDuration?.trim();
  if (plannedDuration) {
    const durationError = validateDuration(plannedDuration);
    if (durationError) throw new Error(`${durationError}. Use formats such as 30m, 2h, or 1h 30m`);
  }

  return {
    name,
    projectId: projectId ?? "none",
    parentTaskId: parentTaskId ?? "none",
    description,
    taskStatusId: taskStatusId ?? "none",
    typeOfWorkId: typeOfWorkId ?? "none",
    taskListId: taskListId ?? "none",
    assigneeIds,
    startOn,
    dueOn,
    plannedDuration,
    isPrio: input.isPrio ?? false,
  };
};
