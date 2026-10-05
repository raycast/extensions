import { Color, Icon } from "@raycast/api";

export const PRIORITIES = [
  { value: 0, name: "High", color: Color.Red, icon: Icon.ExclamationMark },
  { value: 1, name: "Normal", color: Color.Yellow, icon: Icon.Minus },
  { value: 2, name: "Low", color: Color.Blue, icon: Icon.ArrowDown },
];

export function getPriorityConfig(priority: number) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1]; // Default to Normal
}
