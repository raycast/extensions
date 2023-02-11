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
  commentsAggregateCount: number;
  lastActivityAt: string;
  completed: boolean;
  completedAt: string | null;
  completedByUserId: string | null;
  orderIndex: number;
  subtasksIds: string[];
  parentTasks: string[];
  subscribersIds: string[];
  // TODO: Dodaj obiekt link
  links: any[];
  url: string;
  trashedAt: string | null;
  trashedByUserId: string | null;
};

export type CreateTaskFormValues = Pick<
  TaskObject,
  "name" | "listIds" | "description" | "status" | "assigneesIds" | "parentTaskId"
>;

export type CreateTaskPayload = CreateTaskFormValues;

export type UpdateTaskFormValues = CreateTaskFormValues;

export type UpdateTaskPayload = Partial<UpdateTaskFormValues>;
