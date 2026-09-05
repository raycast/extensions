import type { CreateTaskInput, Task, TaskRef, UpdateTaskInput } from "../../domain/task";
import type { Project } from "../../domain/project";
import type { TaskQuery } from "../../domain/query";

export interface BackendCapabilities {
  create: boolean;
  update: boolean;
  complete: boolean;
  reopen: boolean;
  move: boolean;
  completedQuery: boolean;
  inboxQuery: boolean;
  exactTaskLink: boolean;
}

export interface TaskQueryResult {
  tasks: Task[];
  failedProjectIds: string[];
}

export interface TickTickBackend {
  readonly id: "mcp" | "openapi" | "macos-legacy";
  capabilities(): BackendCapabilities;
  accountIdentity(signal?: AbortSignal): Promise<string | undefined>;
  listProjects(signal?: AbortSignal): Promise<Project[]>;
  queryTasks(query: TaskQuery, signal?: AbortSignal): Promise<TaskQueryResult>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(ref: TaskRef, patch: UpdateTaskInput): Promise<Task>;
  completeTask(ref: TaskRef): Promise<void>;
  reopenTask(ref: TaskRef): Promise<void>;
  moveTask(ref: TaskRef, targetProjectId: string): Promise<Task>;
}
