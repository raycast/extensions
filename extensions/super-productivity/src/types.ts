export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  isDone: boolean;
  timeEstimate: number;
  timeSpent: number;
  projectId?: string;
  tagIds?: string[];
  parentId?: string;
  subTaskIds?: string[];
  dueDay?: string;
  dueWithTime?: boolean;
  plannedAt?: number;
  created: number;
  modified: number;
}

export interface Project {
  id: string;
  title: string;
  isHiddenFromMenu?: boolean;
  isEnableBacklog?: boolean;
  backlogTaskIds?: string[];
  note?: string;
}

export interface Tag {
  id: string;
  title: string;
  color?: string;
  icon?: string;
}

export interface CurrentTask {
  id: string;
  title: string;
  timeSpentOnDay: Record<string, number>;
  timeSpent: number;
  isDone: boolean;
}

export interface StatusResponse {
  currentTask: CurrentTask | null;
  currentTaskId: string | null;
  taskCount: number;
}

export interface HealthResponse {
  server: string;
  rendererReady: boolean;
}

export interface CreateTaskPayload {
  title: string;
  notes?: string;
  isDone?: boolean;
  timeEstimate?: number;
  timeSpent?: number;
  projectId?: string;
  tagIds?: string[];
  dueDay?: string;
  dueWithTime?: boolean;
  plannedAt?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  notes?: string;
  isDone?: boolean;
  timeEstimate?: number;
  timeSpent?: number;
  projectId?: string;
  tagIds?: string[];
  dueDay?: string;
  dueWithTime?: boolean;
  plannedAt?: number;
}

export interface TaskQueryParams {
  query?: string;
  projectId?: string;
  tagId?: string;
  includeDone?: boolean;
  source?: "active" | "archived" | "all";
}

export interface CreateTagPayload {
  title: string;
  color?: string;
  icon?: string;
}

export interface UpdateTagPayload {
  title?: string;
  color?: string;
  icon?: string;
}
