export type SpEnvelope<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

export interface SpHealth {
  server: "up";
  rendererReady: boolean;
}

export interface SpProject {
  id: string;
  title: string;
  color?: string | null;
}

export interface SpTag {
  id: string;
  title: string;
  color?: string | null;
}

export interface SpTask {
  id: string;
  title: string;
  notes?: string;
  isDone: boolean;
  projectId?: string | null;
  tagIds: string[];
  parentId?: string | null;
  subTaskIds: string[];
  dueDay?: string | null;
  dueWithTime?: number | null;
  plannedAt?: number | null;
  timeEstimate: number;
  timeSpent: number;
  created?: number;
  repeatCfgId?: string | null;
}

export interface SpStatus {
  currentTask: SpTask | null;
  currentTaskId: string | null;
  taskCount: number;
}

export interface ListTasksParams {
  query?: string;
  projectId?: string;
  tagId?: string;
  includeDone?: boolean;
  source?: "active" | "archived" | "all";
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  isDone?: boolean;
  timeEstimate?: number;
  timeSpent?: number;
  projectId?: string;
  tagIds?: string[];
  dueDay?: string;
  dueWithTime?: number;
  plannedAt?: number;
  parentId?: string;
}

export type UpdateTaskInput = Partial<
  Pick<
    CreateTaskInput,
    | "title"
    | "notes"
    | "isDone"
    | "timeEstimate"
    | "timeSpent"
    | "projectId"
    | "tagIds"
    | "dueDay"
    | "dueWithTime"
    | "plannedAt"
  >
>;
