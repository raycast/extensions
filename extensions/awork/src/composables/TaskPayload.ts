import { convertDurationsToSeconds } from "./ValidateDuration";

export interface CreateTaskValues {
  name: string;
  projectId: string;
  parentTaskId: string;
  description?: string;
  taskStatusId: string;
  typeOfWorkId: string;
  taskListId: string;
  assigneeIds: string[];
  startOn: Date | null;
  dueOn: Date | null;
  plannedDuration?: string;
  isPrio: boolean;
}

export interface CreateTaskPayload {
  name: string;
  baseType: "projecttask" | "private";
  entityId?: string;
  parentId?: string;
  description?: string;
  isPrio: boolean;
  startOn?: string;
  dueOn?: string;
  plannedDuration?: number;
  typeOfWorkId?: string;
  taskStatusId?: string;
  lists?: { id: string }[];
}

// awork treats startOn/dueOn as calendar dates. Using toISOString() would shift the
// picked day for users east of UTC (local midnight becomes the previous day in UTC),
// so the payload is built from the local date components instead.
export const toLocalDateIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00Z`;
};

export const buildCreateTaskPayload = (values: CreateTaskValues): CreateTaskPayload => {
  const description = values.description?.trim();
  const plannedDuration = values.plannedDuration?.trim();
  const baseType = values.projectId === "none" ? "private" : "projecttask";

  return {
    name: values.name.trim(),
    baseType,
    ...(baseType === "projecttask" ? { entityId: values.projectId } : {}),
    ...(baseType === "projecttask" && values.parentTaskId !== "none" ? { parentId: values.parentTaskId } : {}),
    isPrio: values.isPrio,
    ...(description ? { description } : {}),
    ...(values.startOn ? { startOn: toLocalDateIso(values.startOn) } : {}),
    ...(values.dueOn ? { dueOn: toLocalDateIso(values.dueOn) } : {}),
    ...(plannedDuration ? { plannedDuration: Math.round(convertDurationsToSeconds(plannedDuration)) } : {}),
    ...(values.typeOfWorkId !== "none" ? { typeOfWorkId: values.typeOfWorkId } : {}),
    ...(values.taskStatusId !== "none" ? { taskStatusId: values.taskStatusId } : {}),
    ...(baseType === "projecttask" && values.taskListId !== "none" ? { lists: [{ id: values.taskListId }] } : {}),
  };
};
