export type TaskObject = {
  id: string;
  model: "task";
  index: number;
  listIds: string[];
  name: string;
  assigneesIds: string[];
  parentTaskId: string | null;
  completed: boolean;
  completedAt: string | null;

  // REVIEW FIELDS
  archivedAt: string | null;
  archivedBy: string | null;
  reserved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskFormValues = {
  name: string;
  listIds: string[];
  description?: string;
  status?: string;
  assigneesIds?: string[];
  parentTaskId?: string | null;
};

export type CreateTaskPayload = CreateTaskFormValues;

export type UpdateTaskFormValues = Omit<CreateTaskFormValues, "icon">;

export type UpdateTaskPayload = Partial<UpdateTaskFormValues>;
