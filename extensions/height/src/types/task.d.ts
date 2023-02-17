import type { Option } from "./fieldTemplate";
import type { ListObject } from "./list";

export type Field = {
  fieldTemplateId: string;
  name: string;
  type: "text" | "labels" | "select" | "date" | "linkedTasks" | "status";
  value: string;
  label: Option | null;
  values?: unknown;
  date?: Date;
  recursion?: unknown;
  labels?: unknown;
  linkedTasks?: unknown;
  linkedTimer?: unknown;
  selectValue: Option | null;
};

export type TaskObject = {
  id: string;
  model: "task";
  createdAt: string;
  createdUserId: string;
  deleted: boolean;
  deletedAt: string | null;
  deletedByUserId: string | null;
  name: string;
  description: string;
  index: number;
  assigneesIds: string[];
  status: string;
  parentTaskId: string | null;
  listIds: string[];
  lists?: ListObject[];
  commentsAggregateCount: number;
  lastActivityAt: string;
  completed: boolean;
  completedAt: string | null;
  completedByUserId: string | null;
  orderIndex: number;
  subtasksIds: string[];
  fields: Field[];
  parentTasks: TaskObject[];
  subscribersIds: string[];
  links: unknown[];
  url: string;
  trashedAt: string | null;
  trashedByUserId: string | null;
};

export type CreateTaskFormValues = Pick<TaskObject, "name" | "listIds" | "description" | "status" | "assigneesIds"> & {
  parentTaskId?: string;
  dueDate?: Date | null;
};

export type CreateTaskPayload = Omit<CreateTaskFormValues, "dueDate"> & {
  fields?: Partial<Field>[];
};

export type UpdateTaskFormValues = CreateTaskFormValues;

export type UpdateTaskPayload = Omit<Partial<UpdateTaskFormValues>, "dueDate", "parentTaskId"> & {
  fields?: Partial<Field>[];
  deleted?: boolean;
  parentTaskId?: string | null;
};

type Effect = {
  type: string;
  name?: string;
  description?: {
    message: string;
  };
  status?: string;
  completedAat?: Date;
  deleted?: boolean;
  parentTaskId?: string | null;
  // OR {add?: string[]; remove?: string[]}
  assigneeIds?: string[];
  // OR {add?: string[]; remove?: string[]}
  listIds?: string[];
  trashState?: "trash" | "active";
  trashStateEffectAt?: Date;
  fieldTemplateId?: string;
  field?: {
    [key: string]: Date | string | number | boolean | string[] | number[] | boolean[] | Record<string, unknown> | null;
  };
};

export type UpdateBatchTaskPayload = {
  patches: {
    taskIds: string[] | number[];
    effects: Effect[];
  }[];
};
