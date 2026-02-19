export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface TaskMetadata {
  task_title?: string;
  task_url?: string;
  [key: string]: string | undefined;
}

export interface Task {
  id: string;
  object: "task";
  status: TaskStatus;
  instructions?: string;
  model?: string;
  created_at: number;
  updated_at: number;
  metadata?: TaskMetadata;
  error?: string;
  credit_usage?: number;
}

export interface GetTasksResponse {
  object: "list";
  data: Task[];
  first_id?: string;
  last_id?: string;
  has_more?: boolean;
}

export interface GetTasksParams {
  query?: string;
  status?: TaskStatus[];
  after?: string;
  limit?: number;
}
