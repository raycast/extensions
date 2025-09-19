/**
 * TaskMaster Types - Simplified for view-only operations
 */

// Core Task Types
export type TaskStatus =
  | "pending"
  | "in-progress"
  | "review"
  | "done"
  | "deferred"
  | "cancelled";
export type TaskPriority = "high" | "medium" | "low";

// Essential Task Interface
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  details?: string;
  dependencies?: string[];
  complexityScore?: number;
  subtasks?: Subtask[];
  testStrategy?: string;
}

// Subtask Interface
export interface Subtask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  dependencies?: Array<number | string>;
}

// TaskMaster File Data Structure
export interface TaskData {
  tasks: Task[];
  currentTag?: string;
  availableTags?: string[];
}

// Simple options for reading tasks
export interface GetTasksOptions {
  status?: string;
  projectRoot?: string;
}

// Settings (view-only relevant fields)
export interface TaskMasterSettings {
  projectRoot: string;
  autoRefresh: boolean;
  showCompletedTasks: boolean;
  maxConcurrentRequests: number;
}
