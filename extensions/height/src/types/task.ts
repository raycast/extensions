import type { Label } from "@/types/fieldTemplate";
import type { ListObject } from "@/types/list";

export interface Field {
  fieldTemplateId: string;
  name: string;
  type: "text" | "labels" | "select" | "date" | "linkedTasks" | "status";
  value: string;
  label: Label | null;
  values?: unknown;
  date?: Date;
  recursion?: unknown;
  labels?: unknown;
  linkedTasks?: unknown;
  linkedTimer?: unknown;
  selectValue: Label | null;
}

export interface TaskObject {
  id: string;
  appearance: string | null;
  model: "task";
  createdAt: string;
  createdUserId: string;
  commentedByUserIds: string[];
  deleted: boolean;
  deletedAt: string | null;
  deletedByUserId: string | null;
  name: string;
  nameTextType: string;
  description: string;
  descriptionTextType: string;
  index: number;
  assigneesIds: string[];
  statusSetId: string | null;
  status: string;
  parentTaskId?: string | null;
  listIds: string[];
  commentsAggregateCount: number;
  lastActivityAt: string;
  completed: boolean;
  completedAt: string | null;
  completedByUserId: string | null;
  startedAt: string;
  completedIn?: string;
  inProgressFor?: string;
  delayedFor: string;
  orderIndex: number;
  subtasksIds: string[];
  completedSubtasksIds: string[];
  fields: Field[];
  parentTasks: ParentTask[];
  access: string;
  subscribersIds: string[];
  links: unknown[];
  url: string;
  trashedAt: string | null;
  trashedByUserId: string | null;
  lists: ListObject[];
}

export interface CreateTaskFormValues
  extends Pick<TaskObject, "name" | "listIds" | "description" | "status" | "assigneesIds"> {
  parentTaskId?: string;
  dueDate?: Date | null;
}

export interface CreateTaskPayload extends Omit<CreateTaskFormValues, "dueDate"> {
  fields?: Partial<Field>[];
}

export type UpdateTaskFormValues = CreateTaskFormValues;

export interface UpdateTaskPayload extends Omit<Partial<UpdateTaskFormValues>, "dueDate" | "parentTaskId"> {
  fields?: Partial<Field>[];
  deleted?: boolean;
  parentTaskId?: string | null;
}

interface Effect {
  type: string;
  name?: string;
  description?: {
    message: string;
  };
  status?: string;
  completedAat?: Date;
  deleted?: boolean;
  parentTaskId?: string | null;
  assigneeIds?: string[];
  listIds?: string[];
  trashState?: "trash" | "active";
  trashStateEffectAt?: Date;
  fieldTemplateId?: string;
  field?: {
    [key: string]: Date | string | number | boolean | string[] | number[] | boolean[] | Record<string, unknown> | null;
  };
}

export interface UpdateBatchTaskPayload {
  patches: {
    taskIds: string[] | number[];
    effects: Effect[];
  }[];
}

export type ParentTask = Pick<
  TaskObject,
  | "id"
  | "model"
  | "appearance"
  | "name"
  | "nameTextType"
  | "description"
  | "descriptionTextType"
  | "index"
  | "status"
  | "listIds"
  | "deleted"
  | "trashedAt"
>;
