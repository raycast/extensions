import { Color, Icon } from "@raycast/api";

import { Task } from "../api";

export function getPriorityIcon(task: Task) {
  const priority = priorities.find((p) => p.value === task.priority);

  if (priority) {
    return priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority.color };
  }
}

// Todoist priorities are reversed
export const priorities = [
  { name: "Priority 1", value: 4, color: Color.Red, keywords: ["p1", "urgent"], icon: "priority.svg" },
  { name: "Priority 2", value: 3, color: Color.Orange, keywords: ["p2", "important"], icon: "priority.svg" },
  { name: "Priority 3", value: 2, color: Color.Blue, keywords: ["p3"], icon: "priority.svg" },
  { name: "Priority 4", value: 1, color: Color.SecondaryText, keywords: ["p4"], icon: "priority-outlined.svg" },
];

export function mapPriority(priority?: number): 1 | 2 | 3 | 4 | undefined {
  const priorityMap: Record<number, 1 | 2 | 3 | 4> = {
    1: 4,
    2: 3,
    3: 2,
    4: 1,
  };

  return priority !== undefined && Object.prototype.hasOwnProperty.call(priorityMap, priority)
    ? priorityMap[priority]
    : undefined;
}
