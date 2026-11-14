import { parseTaskToolDate, requireAworkUuid } from "./CreateTaskTool";
import { buildEditTaskValues, EditableTask } from "./EditTask";
import { CreateTaskValues } from "./TaskPayload";
import { validateDuration } from "./ValidateDuration";

export interface EditTaskToolData {
  taskId: string;
  name?: string;
  description?: string;
  clearDescription?: boolean;
  taskStatusId?: string;
  typeOfWorkId?: string;
  parentTaskId?: string;
  clearParentTask?: boolean;
  taskListId?: string;
  clearTaskList?: boolean;
  assigneeIds?: string[];
  clearAssignees?: boolean;
  startOn?: string;
  clearStartOn?: boolean;
  dueOn?: string;
  clearDueOn?: boolean;
  plannedDuration?: string;
  clearPlannedDuration?: boolean;
  isPrio?: boolean;
}

const hasValue = (value: unknown) => value !== undefined;

export const hasRequestedTaskEdit = (input: EditTaskToolData) =>
  [
    input.name,
    input.description,
    input.taskStatusId,
    input.typeOfWorkId,
    input.parentTaskId,
    input.taskListId,
    input.assigneeIds,
    input.startOn,
    input.dueOn,
    input.plannedDuration,
  ].some(hasValue) ||
  input.clearDescription === true ||
  input.clearParentTask === true ||
  input.clearTaskList === true ||
  input.clearAssignees === true ||
  input.clearStartOn === true ||
  input.clearDueOn === true ||
  input.clearPlannedDuration === true ||
  input.isPrio !== undefined;

const rejectConflictingClear = (value: unknown, clear: boolean | undefined, field: string) => {
  if (hasValue(value) && clear) throw new Error(`${field} and its clear option cannot be used together`);
};

const optionalUuid = (value: string | undefined, field: string) =>
  value === undefined ? undefined : requireAworkUuid(value, field);

export const buildEditTaskToolValues = (task: EditableTask, input: EditTaskToolData): CreateTaskValues => {
  requireAworkUuid(input.taskId, "taskId");
  if (input.taskId.toLowerCase() !== task.id.toLowerCase()) throw new Error("The loaded task does not match taskId");
  if (!hasRequestedTaskEdit(input)) throw new Error("At least one task field must be changed");

  rejectConflictingClear(input.description, input.clearDescription, "description");
  rejectConflictingClear(input.parentTaskId, input.clearParentTask, "parentTaskId");
  rejectConflictingClear(input.taskListId, input.clearTaskList, "taskListId");
  rejectConflictingClear(input.assigneeIds, input.clearAssignees, "assigneeIds");
  rejectConflictingClear(input.startOn, input.clearStartOn, "startOn");
  rejectConflictingClear(input.dueOn, input.clearDueOn, "dueOn");
  rejectConflictingClear(input.plannedDuration, input.clearPlannedDuration, "plannedDuration");

  const values = buildEditTaskValues(task);

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("name cannot be empty");
    if (name.length > 1000) throw new Error("name can contain at most 1,000 characters");
    values.name = name;
  }

  if (input.clearDescription) values.description = "";
  else if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description) throw new Error("Use clearDescription=true to remove the description");
    if (description.length > 25000) throw new Error("description can contain at most 25,000 characters");
    values.description = description;
  }

  const taskStatusId = optionalUuid(input.taskStatusId, "taskStatusId");
  if (taskStatusId) values.taskStatusId = taskStatusId;
  const typeOfWorkId = optionalUuid(input.typeOfWorkId, "typeOfWorkId");
  if (typeOfWorkId) values.typeOfWorkId = typeOfWorkId;

  if (task.baseType === "private") {
    if (
      hasValue(input.parentTaskId) ||
      input.clearParentTask ||
      hasValue(input.taskListId) ||
      input.clearTaskList ||
      hasValue(input.assigneeIds) ||
      input.clearAssignees
    ) {
      throw new Error("Private tasks cannot change parent tasks, task lists, or assignees");
    }
  } else {
    const parentTaskId = optionalUuid(input.parentTaskId, "parentTaskId");
    if (input.clearParentTask) values.parentTaskId = "none";
    else if (parentTaskId) values.parentTaskId = parentTaskId;

    const taskListId = optionalUuid(input.taskListId, "taskListId");
    if (input.clearTaskList) values.taskListId = "none";
    else if (taskListId) values.taskListId = taskListId;

    if (input.clearAssignees) values.assigneeIds = [];
    else if (input.assigneeIds !== undefined) {
      values.assigneeIds = [...new Set(input.assigneeIds.map((id) => requireAworkUuid(id, "assigneeIds")))];
    }
  }

  if (input.clearStartOn) values.startOn = null;
  else if (input.startOn !== undefined) values.startOn = parseTaskToolDate(input.startOn, "startOn");
  if (input.clearDueOn) values.dueOn = null;
  else if (input.dueOn !== undefined) values.dueOn = parseTaskToolDate(input.dueOn, "dueOn");
  if (values.startOn && values.dueOn && values.dueOn < values.startOn) {
    throw new Error("dueOn cannot be before startOn");
  }

  if (input.clearPlannedDuration) values.plannedDuration = "";
  else if (input.plannedDuration !== undefined) {
    const plannedDuration = input.plannedDuration.trim();
    if (!plannedDuration) throw new Error("Use clearPlannedDuration=true to remove planned effort");
    const durationError = validateDuration(plannedDuration);
    if (durationError) throw new Error(`${durationError}. Use formats such as 30m, 2h, or 1h 30m`);
    values.plannedDuration = plannedDuration;
  }

  if (input.isPrio !== undefined) values.isPrio = input.isPrio;
  return values;
};
