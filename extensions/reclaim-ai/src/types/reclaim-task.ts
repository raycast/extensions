// Reclaim 2.0 ("Assistant") task model. These map to the /reclaim-tasks (GTD
// task pool) endpoints and are a leaner shape than the 1.0 `Task` — notably
// there is no time-chunk / instance / time-policy model here.

export type ReclaimTaskPriority = "P1" | "P2" | "P3" | "P4" | "PRIORITIZE" | "DEFAULT";

const RECLAIM_TASK_PRIORITIES: readonly ReclaimTaskPriority[] = ["P1", "P2", "P3", "P4", "PRIORITIZE", "DEFAULT"];

export const toReclaimTaskPriority = (value: string | undefined): ReclaimTaskPriority | undefined =>
  RECLAIM_TASK_PRIORITIES.find((p) => p === value);

// ReclaimTask ids come back namespaced (e.g. "RECLAIM:96304"), but the
// /reclaim-tasks/{id} endpoints expect the bare numeric id ("96304").
export const reclaimTaskApiId = (id: string): string => (id.includes(":") ? id.slice(id.indexOf(":") + 1) : id);

export interface ReclaimTaskLink {
  url: string;
}

export interface ReclaimTask {
  id: string;
  title: string;
  description?: string | null;
  priority?: ReclaimTaskPriority | null;
  status?: string | null;
  link?: ReclaimTaskLink | null;
  due?: string | null;
  start?: string | null;
  completed: boolean;
  estimateMinutes?: number | null;
  sortOrder: number;
  type?: string;
}

// POST /reclaim-tasks
export interface CreateReclaimTaskRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimateMinutes?: number | null;
  priority?: ReclaimTaskPriority | null;
}

// PATCH /reclaim-tasks/{id}
export interface UpdateReclaimTaskRequest {
  title?: string | null;
  description?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  completed?: boolean | null;
  estimateMinutes?: number | null;
  priority?: ReclaimTaskPriority | null;
}
