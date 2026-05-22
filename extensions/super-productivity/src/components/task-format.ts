import { SpTask } from "../lib/sp-models";

export const TODAY_TAG_ID = "TODAY";

export const formatDuration = (durationMs?: number | null): string | null => {
  if (!durationMs || durationMs <= 0) {
    return null;
  }

  const minutes = Math.round(durationMs / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const formatTaskTiming = (
  task: Pick<SpTask, "timeEstimate" | "timeSpent">,
): { estimate: string | null; spent: string | null } => ({
  estimate: formatDuration(task.timeEstimate),
  spent: formatDuration(task.timeSpent),
});

export const formatDateValue = (
  value?: string | number | null,
): Date | null => {
  if (!value) {
    return null;
  }

  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getTaskStateLabel = (
  task: Pick<SpTask, "id" | "isDone" | "parentId">,
  currentTaskId: string | null,
): "Current" | "Done" | "Subtask" | "Active" => {
  if (task.id === currentTaskId) {
    return "Current";
  }
  if (task.isDone) {
    return "Done";
  }
  if (task.parentId) {
    return "Subtask";
  }
  return "Active";
};

export const shouldCloseWindowAfterDoneToggle = (isDone: boolean): boolean =>
  !isDone;
