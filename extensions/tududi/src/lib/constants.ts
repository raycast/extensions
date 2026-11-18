import { Color, Icon } from "@raycast/api";

export const TASK_STATUS = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  DONE: 2,
  ARCHIVED: 3,
  WAITING: 4,
  CANCELLED: 5,
  PLANNED: 6,
} as const;

export const TASK_STATUS_LABELS: Record<number, string> = {
  [TASK_STATUS.NOT_STARTED]: "Not Started",
  [TASK_STATUS.IN_PROGRESS]: "In Progress",
  [TASK_STATUS.DONE]: "Done",
  [TASK_STATUS.ARCHIVED]: "Archived",
  [TASK_STATUS.WAITING]: "Waiting",
  [TASK_STATUS.CANCELLED]: "Cancelled",
  [TASK_STATUS.PLANNED]: "Planned",
};

export const TASK_PRIORITY = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
} as const;

export const TASK_PRIORITY_LABELS: Record<number, string> = {
  [TASK_PRIORITY.LOW]: "Low",
  [TASK_PRIORITY.MEDIUM]: "Medium",
  [TASK_PRIORITY.HIGH]: "High",
};

export const TASK_PRIORITY_VALUES: Record<string, number> = {
  low: TASK_PRIORITY.LOW,
  medium: TASK_PRIORITY.MEDIUM,
  high: TASK_PRIORITY.HIGH,
};

/** Statuses that appear in Tududi's Today plan (Planned section). */
export const TODAY_PLAN_STATUSES = new Set<number>([TASK_STATUS.IN_PROGRESS, TASK_STATUS.WAITING, TASK_STATUS.PLANNED]);

export function getStatusLabel(status: number): string {
  return TASK_STATUS_LABELS[status] ?? "Unknown";
}

export function getPriorityLabel(priority: number): string {
  return TASK_PRIORITY_LABELS[priority] ?? "Low";
}

export function getPriorityColor(priority: number): Color {
  switch (priority) {
    case TASK_PRIORITY.HIGH:
      return Color.Red;
    case TASK_PRIORITY.MEDIUM:
      return Color.Yellow;
    case TASK_PRIORITY.LOW:
      return Color.Blue;
    default:
      return Color.PrimaryText;
  }
}

export function getTaskIcon(status: number, priority: number) {
  return {
    source: status === TASK_STATUS.DONE ? Icon.CheckCircle : Icon.Circle,
    tintColor: getPriorityColor(priority),
  };
}

export function isInTodayPlan(status: number): boolean {
  return TODAY_PLAN_STATUSES.has(status);
}

export function parsePriority(value: string | number | undefined | null): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value in TASK_PRIORITY_VALUES) {
    return TASK_PRIORITY_VALUES[value];
  }
  return TASK_PRIORITY.LOW;
}
