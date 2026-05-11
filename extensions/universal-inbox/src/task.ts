export interface Task {
  id: string;
  source_id: string;
  title: string;
  body: string;
  status: TaskStatus;
  completed_at?: Date;
  priority: TaskPriority;
  due_at?: DueDate;
  tags: Array<string>;
  parent_id?: string;
  project: string;
  is_recurring: boolean;
  created_at: Date;
  metadata: TaskMetadata;
  user_id: string;
}

export type TaskMetadata = {
  type: "Todoist";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
};

export enum TaskStatus {
  Active = "Active",
  Done = "Done",
  Deleted = "Deleted",
}

export enum TaskPriority {
  P1 = 1,
  P2 = 2,
  P3 = 3,
  P4 = 4,
}

export type DueDate =
  | { type: "Date"; content: Date }
  | { type: "DateTime"; content: Date }
  | { type: "DateTimeWithTz"; content: Date };
