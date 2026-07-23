import { Color, Icon, Image } from "@raycast/api";
import { Task } from "../api";

// OpenTask priorities: 1 is the highest/most urgent, 4 is the default.

export const priorities: { value: 1 | 2 | 3 | 4; name: string; color: Color; keywords: string[] }[] = [
  { value: 1, name: "Priority 1", color: Color.Red, keywords: ["p1", "urgent"] },
  { value: 2, name: "Priority 2", color: Color.Orange, keywords: ["p2"] },
  { value: 3, name: "Priority 3", color: Color.Blue, keywords: ["p3"] },
  { value: 4, name: "Priority 4", color: Color.SecondaryText, keywords: ["p4"] },
];

export function getPriorityIcon(task: Task): Image.ImageLike {
  const priority = priorities.find((p) => p.value === task.priority) ?? priorities[3];
  return {
    source: task.priority === 4 ? Icon.Circle : Icon.CircleFilled,
    tintColor: priority.color,
  };
}
