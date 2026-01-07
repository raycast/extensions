import { Task } from "../api";

export type TypeFilter = "all" | "Conversation" | "Ticket";
export type StatusFilter = "open" | "completed" | "all";

const VALID_STATUS_FILTERS: StatusFilter[] = ["open", "completed", "all"];
const VALID_TYPE_FILTERS: TypeFilter[] = ["all", "Conversation", "Ticket"];

const DEFAULT_FILTERS: TaskFilters = {
  status: "open",
  type: "all",
};

export interface TaskFilters {
  status: StatusFilter;
  type: TypeFilter;
}

/**
 * Filters tasks based on status and type
 */
export function filterTasks(tasks: Task[] | undefined, filters: TaskFilters): Task[] {
  if (!tasks) return [];

  return tasks.filter((task) => {
    // Status filter
    if (filters.status === "open") {
      if (task.status === "completed" || task.status === "canceled") return false;
    } else if (filters.status === "completed") {
      if (task.status !== "completed") return false;
    }

    // Type filter
    if (filters.type !== "all") {
      if (task.type !== filters.type) return false;
    }

    return true;
  });
}

/**
 * Parse combined filter value (format: "status:type")
 * Returns default filters if the value is invalid
 */
export function parseFilterValue(value: string): TaskFilters {
  const parts = value.split(":");
  if (parts.length !== 2) {
    return DEFAULT_FILTERS;
  }

  const [status, type] = parts;

  const isValidStatus = VALID_STATUS_FILTERS.includes(status as StatusFilter);
  const isValidType = VALID_TYPE_FILTERS.includes(type as TypeFilter);

  if (!isValidStatus || !isValidType) {
    return DEFAULT_FILTERS;
  }

  return {
    status: status as StatusFilter,
    type: type as TypeFilter,
  };
}

/**
 * Build filter description for empty states
 */
export function getFilterDescription(filters: TaskFilters, context?: string): string {
  const parts: string[] = [];
  if (filters.status === "open") parts.push("open");
  if (filters.status === "completed") parts.push("completed");
  if (filters.type !== "all") parts.push(filters.type.toLowerCase());

  const itemDescription = parts.length > 0 ? `${parts.join(" ")} items` : "items";
  return context ? `No ${itemDescription} for ${context}` : `No ${itemDescription} found`;
}

/**
 * Sort tasks by created date (newest first)
 */
export function sortTasksByCreatedDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
