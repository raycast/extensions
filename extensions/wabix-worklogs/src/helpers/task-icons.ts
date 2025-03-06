import { TaskType } from "../../types";

export function getTaskTypeLabel(type: TaskType): string {
  return type || TaskType.OTHER;
}
