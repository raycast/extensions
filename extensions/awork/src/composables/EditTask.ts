import { CreateTaskValues, toLocalDateIso } from "./TaskPayload";
import { convertDurationsToSeconds } from "./ValidateDuration";
import { requireSuccessfulTaskApiResponse, taskApiRequest } from "./TaskApi";

export interface EditableTaskAssignee {
  id: string;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface EditableTaskList {
  id: string;
  name?: string | null;
  isPrimary?: boolean;
}

export interface EditableTask {
  id: string;
  name: string;
  description?: string | null;
  isPrio: boolean;
  startOn?: string | null;
  dueOn?: string | null;
  plannedDuration?: number | null;
  baseType: "projecttask" | "private";
  taskStatusId: string;
  typeOfWorkId: string;
  projectId?: string | null;
  project?: { id: string; name: string };
  parentId?: string | null;
  parentTask?: { id: string; name?: string | null };
  numberOfSubtasks?: number | null;
  assignees?: EditableTaskAssignee[] | null;
  lists?: EditableTaskList[] | null;
  taskIdentifier?: string | null;
}

export interface EditTaskChanges {
  parent: "attach" | "detach" | "unchanged";
  fields: boolean;
  status: boolean;
  typeOfWork: boolean;
  taskList: boolean;
  assignees: boolean;
}

const toFormDate = (value?: string | null): Date | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

export const formatPlannedDuration = (seconds?: number | null): string => {
  if (!seconds) return "";
  const roundedMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean).join(" ");
};

const primaryTaskListId = (task: EditableTask) =>
  task.lists?.find((list) => list.isPrimary)?.id ?? task.lists?.[0]?.id ?? "none";

const assigneeIds = (task: EditableTask) =>
  task.assignees?.map((assignee) => assignee.userId ?? assignee.id).filter(Boolean) ?? [];

export const buildEditTaskValues = (task: EditableTask): CreateTaskValues => ({
  name: task.name,
  projectId: task.baseType === "projecttask" ? (task.projectId ?? "none") : "none",
  parentTaskId: task.baseType === "projecttask" ? (task.parentId ?? "none") : "none",
  description: task.description ?? "",
  taskStatusId: task.taskStatusId,
  typeOfWorkId: task.typeOfWorkId,
  taskListId: task.baseType === "projecttask" ? primaryTaskListId(task) : "none",
  assigneeIds: task.baseType === "projecttask" ? assigneeIds(task) : [],
  startOn: toFormDate(task.startOn),
  dueOn: toFormDate(task.dueOn),
  plannedDuration: formatPlannedDuration(task.plannedDuration),
  isPrio: task.isPrio,
});

export const buildEditTaskPayload = (values: CreateTaskValues) => ({
  name: values.name.trim(),
  description: values.description?.trim() || null,
  isPrio: values.isPrio,
  startOn: values.startOn ? toLocalDateIso(values.startOn) : null,
  dueOn: values.dueOn ? toLocalDateIso(values.dueOn) : null,
  plannedDuration: values.plannedDuration?.trim()
    ? Math.round(convertDurationsToSeconds(values.plannedDuration))
    : null,
});

const sameIds = (left: string[], right: string[]) => {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((id, index) => id === sortedRight[index]);
};

// The form cannot manage parents of private tasks (it always submits "none"),
// so treating them as changed would detach private subtasks on every save.
const getParentChange = (task: EditableTask, values: CreateTaskValues): EditTaskChanges["parent"] => {
  if (task.baseType !== "projecttask") return "unchanged";
  const oldParentId = task.parentId ?? "none";
  if (oldParentId === values.parentTaskId) return "unchanged";
  return values.parentTaskId === "none" ? "detach" : "attach";
};

// The task endpoint replaces every field it receives, so an edit that only touches
// reference data must not send it: the seconds of a planned duration that is not
// minute-aligned would be rewritten by the form's "1h 30m" round trip.
const hasFieldChanges = (task: EditableTask, values: CreateTaskValues) =>
  JSON.stringify(buildEditTaskPayload(values)) !== JSON.stringify(buildEditTaskPayload(buildEditTaskValues(task)));

export const getEditTaskChanges = (task: EditableTask, values: CreateTaskValues): EditTaskChanges => ({
  parent: getParentChange(task, values),
  fields: hasFieldChanges(task, values),
  status: task.taskStatusId !== values.taskStatusId,
  typeOfWork: task.typeOfWorkId !== values.typeOfWorkId,
  taskList: task.baseType === "projecttask" && primaryTaskListId(task) !== values.taskListId,
  assignees: task.baseType === "projecttask" && !sameIds(assigneeIds(task), values.assigneeIds),
});

export const validateEditTaskParent = (
  task: EditableTask,
  parentTask: { id: string; projectId: string; parentId?: string } | undefined,
  parentTaskId: string,
) => {
  if (parentTaskId === "none") return;
  if ((task.numberOfSubtasks ?? 0) > 0) throw new Error("A task with subtasks cannot be nested under another task");
  if (parentTaskId === task.id) throw new Error("A task cannot be nested under itself");
  if (!parentTask || parentTask.id !== parentTaskId) throw new Error("The selected parent task is unavailable");
  if (parentTask.parentId) throw new Error("A subtask cannot be used as the parent of another subtask");
  if (!task.projectId || parentTask.projectId !== task.projectId) {
    throw new Error("The parent task must be in the same project");
  }
};

export const getTask = async (token: string, taskId: string): Promise<EditableTask> => {
  const result = await requireSuccessfulTaskApiResponse(await taskApiRequest(`tasks/${taskId}`, token));
  return (await result.response.json()) as EditableTask;
};

const postTaskChange = async (path: string, token: string, body: unknown) =>
  requireSuccessfulTaskApiResponse(await taskApiRequest(path, token, { method: "POST", body: JSON.stringify(body) }));

export const updateTask = async (token: string, task: EditableTask, values: CreateTaskValues): Promise<void> => {
  const expectedProjectId = task.baseType === "projecttask" ? task.projectId : undefined;
  if ((expectedProjectId ?? "none") !== values.projectId) {
    throw new Error("The project of a task cannot be changed in this form");
  }

  const changes = getEditTaskChanges(task, values);
  let activeToken = token;

  if (changes.parent === "detach") {
    const result = await postTaskChange("tasks/changesubtaskstoparent", activeToken, [{ taskId: task.id }]);
    activeToken = result.token;
  } else if (changes.parent === "attach") {
    const result = await postTaskChange("tasks/changesubtasks", activeToken, [
      { taskId: task.id, parentId: values.parentTaskId },
    ]);
    activeToken = result.token;
  }

  if (changes.fields) {
    const updateResult = await requireSuccessfulTaskApiResponse(
      await taskApiRequest(`tasks/${task.id}`, activeToken, {
        method: "PUT",
        body: JSON.stringify(buildEditTaskPayload(values)),
      }),
    );
    activeToken = updateResult.token;
  }

  if (changes.status) {
    const result = await postTaskChange("tasks/changestatuses", activeToken, [
      { taskId: task.id, statusId: values.taskStatusId },
    ]);
    activeToken = result.token;
  }
  if (changes.typeOfWork) {
    const result = await postTaskChange("tasks/changetypeofwork", activeToken, {
      typeOfWorkId: values.typeOfWorkId,
      taskIds: [task.id],
      changeTimeEntries: false,
    });
    activeToken = result.token;
  }
  if (changes.taskList) {
    const result = await postTaskChange("tasks/changelists", activeToken, [
      {
        taskId: task.id,
        taskLists: values.taskListId === "none" ? [] : [{ id: values.taskListId }],
      },
    ]);
    activeToken = result.token;
  }
  if (changes.assignees) {
    await postTaskChange(`tasks/${task.id}/setassignees`, activeToken, values.assigneeIds);
  }
};
